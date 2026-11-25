// The hooks on every collection a workflow runs on. `beforeChange` / `beforeDelete` enforce the
// guards and `requiredToPublish` for every writer (admin, REST, GraphQL, Local API), and record a
// write that went through with the bypass flag; `afterChange` / `afterDelete` start, settle and
// abort runs (not start or settle with the skip flag) and keep the runs' visibility values in
// step with the document. A workflow error never fails a save by itself: it is logged and the
// save goes on. Unless it cost the save its transaction (see `server/transaction.ts`): then the
// save is already rolled back, and the hook fails it loudly instead of letting it report a
// success. And unless the runs' visibility values cannot be kept up to date (`syncVisibility`):
// they decide who sees the runs, so that save fails too. Conditions see the document in the default locale (`loadSubject`): a hook that holds
// it in another locale reads it again, only when something is to be evaluated.

import type {
  CollectionSlug,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
  SanitizedCollectionConfig,
} from "payload";
import { APIError } from "payload";

import { RUNS_SLUG, WORKFLOW_BYPASS, WORKFLOW_SKIP } from "./constants.js";
import {
  SYSTEM,
  findStage,
  holdMessage,
  holdingGuards,
  start as startState,
} from "./engine/engine.js";
import {
  abortRun,
  canRunInline,
  inOtherLocale,
  languageOf,
  loadSubject,
  runJobsInline,
  settingsOf,
  settleRun,
  startRun,
  traceBypass,
  userRefOf,
} from "./server/operations.js";
import {
  publishChecks,
  refusedPublish,
  requiredWorkflows,
  usePublish,
} from "./server/publishing.js";
import { findRuns, subjectWhere, toState } from "./server/store.js";
import type { InstanceDoc, JobId } from "./server/store.js";
import { transactionLost, transactionOf } from "./server/transaction.js";
import type { TransactionId } from "./server/transaction.js";
import { applyVisibility, sameValues, valuesOfRun, visibilityOf } from "./server/visibility.js";
import type { VisibilityValues } from "./server/visibility.js";
import type { GuardDef, GuardOperation, StartOnCreate } from "./types.js";
import { labelText } from "./vocabulary.js";

type Doc = Record<string, unknown>;

/** One query for a document's active runs. */
const activeRuns = (req: PayloadRequest, collection: string, id: string | number) =>
  findRuns(req, subjectWhere({ collection, id: String(id) }, true));

/** Whether the document has any run, finished ones included (one indexed count). */
const hasRuns = async (req: PayloadRequest, collection: string, id: string): Promise<boolean> =>
  (
    await req.payload.count({
      collection: RUNS_SLUG as CollectionSlug,
      where: subjectWhere({ collection, id }, false),
      overrideAccess: true,
      req,
    })
  ).totalDocs > 0;

export const hasDrafts = (collection: CollectionConfig | undefined): boolean =>
  Boolean(
    collection?.versions && typeof collection.versions === "object" && collection.versions.drafts
  );

// ---- The document as conditions see it -------------------------------------------------------

/**
 * The document after a write of `data` in another locale, as the default locale holds it: `base`
 * (the default-locale document before the write; `{}` on create) with the written values of the
 * fields that are not localized, which a write in any locale changes for all.
 */
const inDefaultLocale = (collection: SanitizedCollectionConfig, base: Doc, data: Doc): Doc => {
  const localized = new Set(
    collection.flattenedFields.flatMap((field) =>
      "localized" in field && field.localized ? [field.name] : []
    )
  );
  return {
    ...base,
    ...Object.fromEntries(Object.entries(data).filter(([key]) => !localized.has(key))),
  };
};

/** The saved document as conditions see it: `doc` itself, or read again in the default locale. */
const savedForEvaluation = async (
  req: PayloadRequest,
  collection: string,
  doc: Doc
): Promise<Doc> =>
  inOtherLocale(req)
    ? ((await loadSubject(req, { collection, id: String(doc.id) }, null)) ?? doc)
    : doc;

// ---- Failures ---------------------------------------------------------------------------------

const logged = (req: PayloadRequest, msg: string, error: unknown) =>
  req.payload.logger.error({ err: error, msg: `workflows: ${msg}` });

/** A save the hook fails on purpose (the cause is logged); passed through `handled` as is. */
class SaveFailed extends APIError {
  constructor(message: string) {
    super(message, 500, null, true);
  }
}

/** The save failed because a workflow error ended its transaction. */
const saveRolledBack = () =>
  new SaveFailed(
    "The document was not saved: its workflow could not be updated, and the failure rolled back the save. Try again; if it keeps failing, see the server log."
  );

/**
 * The save failed because the runs' visibility values could not be brought up to date: saving
 * anyway could leave the document's workflows visible to the wrong people.
 */
const visibilityNotUpdated = () =>
  new SaveFailed(
    "The document was not saved: its workflow visibility could not be updated, so its workflows could be shown to the wrong people. Try again; if it keeps failing, see the server log."
  );

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
  if (error instanceof SaveFailed) {
    throw error;
  }
  logged(req, msg, error);
  if (await transactionLost(req, began)) {
    logged(req, "the error ended the save's transaction: failing the save", error);
    throw saveRolledBack();
  }
};

// ---- Guards ---------------------------------------------------------------------------------

/**
 * A document's active runs with the guards holding in each right now. The document (`docOf`) is
 * read only when one of them is in a stage with guards.
 */
const holdingOn = async (
  req: PayloadRequest,
  collection: string,
  id: string | number,
  docOf: () => Promise<Doc | null>
): Promise<{ run: InstanceDoc; guards: GuardDef[] }[]> => {
  const { workflows } = settingsOf(req.payload);
  const runs = (await activeRuns(req, collection, id)).flatMap((run) => {
    const def = workflows.find((entry) => entry.name === run.workflow);
    return def && (findStage(def, run.stage)?.guards ?? []).length > 0 ? [{ run, def }] : [];
  });
  if (runs.length === 0) {
    return [];
  }
  const doc = await docOf();
  const now = new Date();
  return runs.flatMap(({ run, def }) => {
    const guards = holdingGuards(def, toState(run), { doc, now });
    return guards.length > 0 ? [{ run, guards }] : [];
  });
};

const refusal = (req: PayloadRequest, guard: GuardDef, operation: GuardOperation) =>
  new APIError(holdMessage([operation], labelText(guard.title, languageOf(req))), 403, null, true);

const bypassed = (req: PayloadRequest) => req.context?.[WORKFLOW_BYPASS] === true;
const skipped = (req: PayloadRequest) => req.context?.[WORKFLOW_SKIP] === true;

const holds = (guard: GuardDef, operation: GuardOperation) => guard.operations.includes(operation);

/** An update that moves a document to the trash (sets `deletedAt` it did not have). */
const isTrashing = (data: Doc | undefined, originalDoc: Doc | undefined): boolean =>
  Boolean(data?.deletedAt) && !originalDoc?.deletedAt;

/**
 * Whether a write publishes the document. Payload sets `data._status` to `"draft"` on a draft
 * save, and leaves it unset on a plain (non-draft) update, which writes the live document of an
 * already published one; so the status falls back to the document's.
 */
const isPublishing = (
  collection: CollectionConfig,
  data: Doc | undefined,
  originalDoc: Doc | undefined
): boolean => hasDrafts(collection) && (data?._status ?? originalDoc?._status) === "published";

/** Whether a workflow starts by itself on a document just created. */
const startsOnCreate = (start: StartOnCreate | undefined, doc: Doc): boolean =>
  start?.on === "create" && (start.when?.({ doc }) ?? true);

/** The workflows of `collection` that may start by themselves on create. */
const autoStarting = (req: PayloadRequest, collection: string) =>
  settingsOf(req.payload).workflows.filter(
    (def) => def.collections.includes(collection) && def.start?.on === "create"
  );

/**
 * The guards that would hold on a document created with `data` (as the default locale holds it):
 * those of the stage each workflow that auto-starts on it would start in, computed with the pure
 * engine (nothing is written). A workflow that would fail to start holds nothing (the save logs
 * why when it tries).
 */
const holdingOnCreate = (req: PayloadRequest, collection: string, data: Doc): GuardDef[] => {
  const now = new Date();
  return autoStarting(req, collection).flatMap((def) => {
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

/**
 * A publish of a collection with workflows `requiredToPublish`: refused unless each one's latest
 * run on the document is completed and unused; when it goes through, it uses them. With the
 * bypass flag nothing is refused, and the runs that would have refused it record that.
 */
const requirePublish = async (
  req: PayloadRequest,
  collection: string,
  id: string | number | undefined
): Promise<void> => {
  if (requiredWorkflows(req, collection).length === 0) {
    return;
  }
  const checks = await publishChecks(req, collection, id);
  const refused = checks.find((check) => check.refusal);
  if (refused && !bypassed(req)) {
    throw refusedPublish(refused.refusal);
  }
  await usePublish(req, checks, bypassed(req));
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
    const incoming = (data ?? {}) as Doc;
    if (isPublishing(collection, incoming, undefined)) {
      if (!bypassed(req)) {
        const doc = inOtherLocale(req) ? inDefaultLocale(collection, {}, incoming) : incoming;
        for (const guard of holdingOnCreate(req, collection.slug, doc)) {
          if (holds(guard, "publish")) {
            throw refusal(req, guard, "publish");
          }
        }
      }
      await requirePublish(req, collection.slug, undefined);
    }
    return data;
  }
  if (operation !== "update" || !originalDoc?.id) {
    return data;
  }
  const incoming = data as Doc | undefined;
  const original = originalDoc as Doc;
  // Moving to the trash is a delete, not an update or a publish.
  const trashing = isTrashing(incoming, original);
  const write = { trashing, publishing: !trashing && isPublishing(collection, incoming, original) };
  const id = originalDoc.id as string | number;
  const holding = await holdingOn(req, collection.slug, id, async () => {
    if (!inOtherLocale(req)) {
      return { ...original, ...incoming };
    }
    const base = await loadSubject(req, { collection: collection.slug, id: String(id) }, null);
    return inDefaultLocale(collection, base ?? original, incoming ?? {});
  });
  if (bypassed(req)) {
    await traceBypasses(req, holding, (guard) => refusedBy(guard, write));
  } else {
    for (const guard of holding.flatMap((entry) => entry.guards)) {
      const refused = refusedBy(guard, write);
      if (refused) {
        throw refusal(req, guard, refused);
      }
    }
  }
  if (write.publishing) {
    await requirePublish(req, collection.slug, id);
  }
  return data;
};

const guardDelete: CollectionBeforeDeleteHook = async ({ collection, id, req }) => {
  // The latest draft, in the default locale, as every other condition sees it.
  const holding = await holdingOn(req, collection.slug, id, () =>
    loadSubject(req, { collection: collection.slug, id: String(id) }, null).catch(() => null)
  );
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
  const by = userRefOf(req.payload, req.user);
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

/**
 * Keeps the runs' visibility values (`visibility`) in step with the saved document: written on
 * every run of it, finished ones included, when they changed with this save (`saved` against
 * `previous`, same locale; unknown when `fromDocument` throws for `previous`) or differ from what
 * its active runs hold. Nothing is read for it, and nothing written when nothing changed.
 * `current` is the document as conditions see it.
 *
 * The one deliberate exception to "a workflow error never fails a save": these values decide who
 * sees the runs. If they cannot be computed for the saved document (`fromDocument` throws) or
 * their write fails, and the document has runs, the save fails (`visibilityNotUpdated`). A
 * document without runs saves (the error is logged).
 */
const syncVisibility = async (
  req: PayloadRequest,
  collection: string,
  saved: { doc: Doc; previous: Doc | undefined; current: () => Promise<Doc> },
  runs: InstanceDoc[]
): Promise<void> => {
  if (!settingsOf(req.payload).visibility) {
    return;
  }
  const id = String(saved.doc.id);
  let writeTried = false;
  try {
    let before: VisibilityValues | undefined;
    try {
      before = visibilityOf(req, collection, saved.previous ?? null);
    } catch (error) {
      // What they were is unknown: treat them as changed, if the saved document's are known.
      logged(req, `visibility.fromDocument failed for the previous ${collection} ${id}`, error);
    }
    const after = visibilityOf(req, collection, saved.doc);
    if (!after) {
      return;
    }
    const moved = !(before && sameValues(before, after));
    if (!moved && runs.length === 0) {
      return;
    }
    const values = visibilityOf(req, collection, await saved.current()) ?? after;
    if (moved || runs.some((run) => !sameValues(valuesOfRun(run, values), values))) {
      writeTried = true;
      await applyVisibility(req, { collection, id }, values);
    }
  } catch (error) {
    logged(req, `could not update who sees the runs of ${collection} ${id}`, error);
    // `fromDocument` threw: a document without runs has no visibility to keep, and its save goes
    // on (runs already known, else one indexed count). A failed write, or a count that fails,
    // fails the save.
    if (writeTried || runs.length > 0 || (await hasRuns(req, collection, id).catch(() => true))) {
      throw visibilityNotUpdated();
    }
  }
};

const followChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const saved = doc as Doc;
  if (operation === "create") {
    if (skipped(req)) {
      return doc;
    }
    const began = await transactionOf(req);
    const candidates = autoStarting(req, collection.slug);
    if (candidates.length === 0) {
      return doc;
    }
    let subject = saved;
    try {
      subject = await savedForEvaluation(req, collection.slug, saved);
    } catch (error) {
      await handled(req, began, `could not read ${collection.slug} ${doc.id}`, error);
    }
    for (const def of candidates) {
      try {
        if (startsOnCreate(def.start, subject)) {
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
  if (isTrashing(saved, previousDoc as Doc | undefined)) {
    await abortRuns(req, collection.slug, doc.id);
    return doc;
  }
  const began = await transactionOf(req);
  const jobs: JobId[] = [];
  const by = userRefOf(req.payload, req.user);
  const cause = { kind: "save" as const, ...(by ? { by } : {}) };
  let runs: InstanceDoc[] = [];
  let subject: Doc | undefined;
  const current = async () => {
    subject ??= await savedForEvaluation(req, collection.slug, saved);
    return subject;
  };
  try {
    // With the skip flag no run is settled, so none is read: visibility still follows the save.
    runs = skipped(req) ? [] : await activeRuns(req, collection.slug, doc.id);
    if (runs.length > 0) {
      await current();
    }
  } catch (error) {
    runs = [];
    await handled(req, began, `could not load runs of ${collection.slug} ${doc.id}`, error);
  }
  try {
    const previous = previousDoc as Doc | undefined;
    await syncVisibility(req, collection.slug, { doc: saved, previous, current }, runs);
  } catch (error) {
    await handled(
      req,
      began,
      `could not update who sees the runs of ${collection.slug} ${doc.id}`,
      error
    );
  }
  for (const run of runs) {
    try {
      jobs.push(...(await settleRun(req, run, subject ?? saved, cause)).jobs);
    } catch (error) {
      await handled(req, began, `could not settle run ${run.id}`, error);
    }
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
