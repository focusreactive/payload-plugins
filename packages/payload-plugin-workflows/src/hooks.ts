// The hooks on every collection a workflow runs on. `beforeChange` / `beforeDelete` enforce the
// guards for every writer (admin, REST, GraphQL, Local API), and record a write that went through
// a holding guard with the bypass flag; `afterChange` / `afterDelete` start, settle and abort runs
// (not start or settle with the skip flag). A workflow error never fails a save by itself: it is
// logged and the save goes on. Unless it cost the save its transaction (see
// `server/transaction.ts`): then the save is already rolled back, and the hook fails it loudly
// instead of letting it report a success.

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { APIError } from "payload";

import { WORKFLOW_BYPASS, WORKFLOW_SKIP } from "./constants.js";
import { SYSTEM, holdMessage, holdingGuards, start as startState } from "./engine/engine.js";
import {
  abortRun,
  canRunInline,
  languageOf,
  runJobsInline,
  settingsOf,
  settleRun,
  startRun,
  traceBypass,
  userRefOf,
} from "./server/operations.js";
import { findRuns, subjectWhere, toState } from "./server/store.js";
import type { InstanceDoc, JobId } from "./server/store.js";
import { transactionLost, transactionOf } from "./server/transaction.js";
import type { TransactionId } from "./server/transaction.js";
import type { GuardDef, GuardOperation, StartOnCreate } from "./types.js";
import { labelText } from "./vocabulary.js";

/** One query for a document's active runs. */
const activeRuns = (req: PayloadRequest, collection: string, id: string | number) =>
  findRuns(req, subjectWhere({ collection, id: String(id) }, true));

export const hasDrafts = (collection: CollectionConfig | undefined): boolean =>
  Boolean(
    collection?.versions && typeof collection.versions === "object" && collection.versions.drafts
  );

// ---- Failures ---------------------------------------------------------------------------------

const logged = (req: PayloadRequest, msg: string, error: unknown) =>
  req.payload.logger.error({ err: error, msg: `workflows: ${msg}` });

/** The save failed because a workflow error ended its transaction. */
class SaveRolledBack extends APIError {
  constructor() {
    super(
      "The document was not saved: its workflow could not be updated, and the failure rolled back the save. Try again; if it keeps failing, see the server log.",
      500,
      null,
      true
    );
  }
}

/**
 * Handles a workflow error in a hook: logs it in full and lets the save go on, unless the save's
 * transaction (`began`, read when the hook started) did not survive it. Then the save's own
 * changes are already rolled back, so the save must fail rather than report success.
 */
const handled = async (
  req: PayloadRequest,
  began: TransactionId | null,
  msg: string,
  error: unknown
): Promise<void> => {
  if (error instanceof SaveRolledBack) {
    throw error;
  }
  logged(req, msg, error);
  if (await transactionLost(req, began)) {
    logged(req, "the error ended the save's transaction: failing the save", error);
    throw new SaveRolledBack();
  }
};

// ---- Guards ---------------------------------------------------------------------------------

/** A document's active runs with the guards holding in each right now. */
const holdingOn = async (
  req: PayloadRequest,
  collection: string,
  id: string | number,
  doc: Record<string, unknown> | null
): Promise<{ run: InstanceDoc; guards: GuardDef[] }[]> => {
  const { workflows } = settingsOf(req.payload);
  const holding: { run: InstanceDoc; guards: GuardDef[] }[] = [];
  for (const run of await activeRuns(req, collection, id)) {
    const def = workflows.find((entry) => entry.name === run.workflow);
    const guards = def ? holdingGuards(def, toState(run), { doc, now: new Date() }) : [];
    if (guards.length > 0) {
      holding.push({ run, guards });
    }
  }
  return holding;
};

const refusal = (req: PayloadRequest, guard: GuardDef, operation: GuardOperation) =>
  new APIError(holdMessage([operation], labelText(guard.title, languageOf(req))), 403, null, true);

const bypassed = (req: PayloadRequest) => req.context?.[WORKFLOW_BYPASS] === true;
const skipped = (req: PayloadRequest) => req.context?.[WORKFLOW_SKIP] === true;

const holds = (guard: GuardDef, operation: GuardOperation) => guard.operations.includes(operation);

/** An update that moves a document to the trash (sets `deletedAt` it did not have). */
const isTrashing = (
  data: Record<string, unknown> | undefined,
  originalDoc: Record<string, unknown> | undefined
): boolean => Boolean(data?.deletedAt) && !originalDoc?.deletedAt;

/**
 * Whether an update writes the published document. Payload sets `data._status` to `"draft"` on a
 * draft save, and leaves it unset on a plain (non-draft) update, which writes the live document of
 * an already published one; so the status falls back to the document's.
 */
const isPublishing = (
  collection: CollectionConfig,
  data: Record<string, unknown> | undefined,
  originalDoc: Record<string, unknown> | undefined
): boolean => hasDrafts(collection) && (data?._status ?? originalDoc?._status) === "published";

/** Whether a workflow starts by itself on a document just created. */
const startsOnCreate = (start: StartOnCreate | undefined, doc: Record<string, unknown>): boolean =>
  start?.on === "create" && (start.when?.({ doc }) ?? true);

/**
 * The guards that would hold on a document created with `data`: those of the stage each workflow
 * that auto-starts on it would start in, computed with the pure engine (nothing is written). A
 * workflow that would fail to start holds nothing (the save logs why when it tries).
 */
const holdingOnCreate = (
  req: PayloadRequest,
  collection: string,
  data: Record<string, unknown>
): GuardDef[] => {
  const now = new Date();
  return settingsOf(req.payload).workflows.flatMap((def) => {
    if (!def.collections.includes(collection)) {
      return [];
    }
    try {
      if (!startsOnCreate(def.start, data)) {
        return [];
      }
      const { state } = startState(def, { actor: SYSTEM }, { doc: data, now });
      return holdingGuards(def, state, { doc: data, now });
    } catch {
      return [];
    }
  });
};

/** Which of `operation`'s kinds a guard refuses for this write, if any. */
const refusedBy = (
  guard: GuardDef,
  write: { trashing: boolean; publishing: boolean }
): GuardOperation | undefined => {
  if (write.trashing) {
    return holds(guard, "delete") ? "delete" : undefined;
  }
  if (write.publishing && holds(guard, "publish")) {
    return "publish";
  }
  return holds(guard, "update") ? "update" : undefined;
};

/**
 * A write with the bypass flag went through: record it on each run whose guards would have held
 * it (`guard-bypassed`, with the operation and the user), in the write's own transaction. A
 * failure is logged; the write goes on unless it lost the transaction.
 */
const traceBypasses = async (
  req: PayloadRequest,
  holding: { run: InstanceDoc; guards: GuardDef[] }[],
  operationOf: (guard: GuardDef) => GuardOperation | undefined
): Promise<void> => {
  const began = await transactionOf(req);
  for (const { run, guards } of holding) {
    const held = guards.filter((guard) => operationOf(guard) !== undefined);
    const [first] = held;
    const operation = first ? operationOf(first) : undefined;
    if (!operation) {
      continue;
    }
    try {
      await traceBypass(req, run, { operation, guards: held, user: req.user });
    } catch (error) {
      await handled(req, began, `could not record the guard bypass on run ${run.id}`, error);
    }
  }
};

const guardChange: CollectionBeforeChangeHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === "create") {
    // A run that starts on create starts after the insert: its first stage's guards are checked
    // here. Creating is neither an update nor a delete of an existing document; only creating it
    // published can be held. (With the bypass flag nothing is held, and there is no run yet to
    // record it on.)
    const incoming = (data ?? {}) as Record<string, unknown>;
    if (!bypassed(req) && isPublishing(collection, incoming, undefined)) {
      for (const guard of holdingOnCreate(req, collection.slug, incoming)) {
        if (holds(guard, "publish")) {
          throw refusal(req, guard, "publish");
        }
      }
    }
    return data;
  }
  if (operation !== "update" || !originalDoc?.id) {
    return data;
  }
  const incoming = data as Record<string, unknown> | undefined;
  const original = originalDoc as Record<string, unknown>;
  // Moving to the trash is a delete, not an update or a publish.
  const trashing = isTrashing(incoming, original);
  const write = { trashing, publishing: !trashing && isPublishing(collection, incoming, original) };
  const merged = { ...originalDoc, ...data } as Record<string, unknown>;
  const holding = await holdingOn(req, collection.slug, originalDoc.id, merged);
  if (bypassed(req)) {
    await traceBypasses(req, holding, (guard) => refusedBy(guard, write));
    return data;
  }
  for (const guard of holding.flatMap((entry) => entry.guards)) {
    const refused = refusedBy(guard, write);
    if (refused) {
      throw refusal(req, guard, refused);
    }
  }
  return data;
};

const guardDelete: CollectionBeforeDeleteHook = async ({ collection, id, req }) => {
  // The latest draft, as every other condition sees it.
  const doc = (await req.payload
    .findByID({
      collection: collection.slug,
      id,
      depth: 0,
      draft: true,
      overrideAccess: true,
      req,
      disableErrors: true,
    })
    .catch(() => null)) as Record<string, unknown> | null;
  const holding = await holdingOn(req, collection.slug, id, doc);
  const deleting = (guard: GuardDef) => (holds(guard, "delete") ? "delete" : undefined);
  if (bypassed(req)) {
    await traceBypasses(req, holding, deleting);
    return;
  }
  for (const guard of holding.flatMap((entry) => entry.guards)) {
    if (deleting(guard)) {
      throw refusal(req, guard, "delete");
    }
  }
};

// ---- Following the document -----------------------------------------------------------------

/**
 * Ends a document's active runs (it was deleted or trashed), as the system. Throws only if the
 * save cannot commit anymore.
 */
const abortRuns = async (req: PayloadRequest, collection: string, id: string | number) => {
  const began = await transactionOf(req);
  const by = userRefOf(req.user);
  try {
    for (const run of await activeRuns(req, collection, id)) {
      try {
        await abortRun(req, {
          instanceId: run.id,
          reason: "Subject deleted",
          user: null,
          cause: { kind: "delete", ...(by ? { by } : {}) },
        });
      } catch (error) {
        await handled(req, began, `could not abort run ${run.id}`, error);
      }
    }
  } catch (error) {
    await handled(req, began, `could not load runs of ${collection} ${id}`, error);
  }
};

const followChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const subject = doc as Record<string, unknown>;
  if (operation === "create" && skipped(req)) {
    return doc;
  }
  if (operation === "create") {
    const began = await transactionOf(req);
    for (const def of settingsOf(req.payload).workflows) {
      try {
        if (def.collections.includes(collection.slug) && startsOnCreate(def.start, subject)) {
          // Runs its effects inline only when the save has no transaction (see `canRunInline`).
          await startRun(req, {
            workflow: def.name,
            collection: collection.slug,
            id: doc.id,
            user: null,
          });
        }
      } catch (error) {
        await handled(
          req,
          began,
          `could not start "${def.name}" on ${collection.slug} ${doc.id}`,
          error
        );
      }
    }
    return doc;
  }
  if (isTrashing(subject, previousDoc as Record<string, unknown> | undefined)) {
    await abortRuns(req, collection.slug, doc.id);
    return doc;
  }
  if (skipped(req)) {
    return doc;
  }
  const began = await transactionOf(req);
  const jobs: JobId[] = [];
  const by = userRefOf(req.user);
  const cause = { kind: "save" as const, ...(by ? { by } : {}) };
  try {
    for (const run of await activeRuns(req, collection.slug, doc.id)) {
      try {
        jobs.push(...(await settleRun(req, run, subject, cause)).jobs);
      } catch (error) {
        await handled(req, began, `could not settle run ${run.id}`, error);
      }
    }
  } catch (error) {
    await handled(req, began, `could not load runs of ${collection.slug} ${doc.id}`, error);
  }
  // Inside the save's transaction the jobs are not committed yet: they wait for the jobs runner.
  if (jobs.length > 0 && (await canRunInline(req))) {
    await runJobsInline(req.payload, jobs);
  }
  return doc;
};

const abortOnDelete: CollectionAfterDeleteHook = ({ collection, id, req }) =>
  abortRuns(req, collection.slug, id);

export const withWorkflowHooks = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  hooks: {
    ...collection.hooks,
    beforeChange: [...(collection.hooks?.beforeChange ?? []), guardChange],
    beforeDelete: [...(collection.hooks?.beforeDelete ?? []), guardDelete],
    afterChange: [...(collection.hooks?.afterChange ?? []), followChange],
    afterDelete: [...(collection.hooks?.afterDelete ?? []), abortOnDelete],
  },
});
