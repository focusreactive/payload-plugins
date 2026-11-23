// The hooks on every collection a workflow runs on. `beforeChange` / `beforeDelete` enforce the
// guards for every writer (admin, REST, GraphQL, Local API); `afterChange` / `afterDelete` start,
// settle and abort runs, and never throw: a workflow bug must not break saving content.

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { APIError } from "payload";

import { WORKFLOW_BYPASS } from "./constants.js";
import { holdingGuards } from "./engine/engine.js";
import {
  abortRun,
  canRunInline,
  runJobsInline,
  settingsOf,
  settleRun,
  startRun,
} from "./server/operations.js";
import { WITHOUT_HISTORY, findRuns, subjectWhere, toState } from "./server/store.js";
import type { JobId } from "./server/store.js";
import type { GuardDef, GuardOperation, StartMode } from "./types.js";

/** One query for a document's active runs, without their history (not needed to guard or settle). */
const activeRuns = (req: PayloadRequest, collection: string, id: string | number) =>
  findRuns(req, subjectWhere({ collection, id: String(id) }, true), WITHOUT_HISTORY);

export const hasDrafts = (collection: CollectionConfig | undefined): boolean =>
  Boolean(
    collection?.versions && typeof collection.versions === "object" && collection.versions.drafts
  );

// ---- Guards ---------------------------------------------------------------------------------

/** The guards holding on a document right now, across all its active runs. */
const holdingOn = async (
  req: PayloadRequest,
  collection: string,
  id: string | number,
  doc: Record<string, unknown> | null
): Promise<GuardDef[]> => {
  const { workflows } = settingsOf(req.payload);
  const holding: GuardDef[] = [];
  for (const run of await activeRuns(req, collection, id)) {
    const def = workflows.find((entry) => entry.name === run.workflow);
    if (def) {
      holding.push(...holdingGuards(def, toState(run), { doc, now: new Date() }));
    }
  }
  return holding;
};

const refusal = (guard: GuardDef) => new APIError(guard.title ?? guard.name, 403, null, true);

const bypassed = (req: PayloadRequest) => req.context?.[WORKFLOW_BYPASS] === true;

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

const guardChange: CollectionBeforeChangeHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== "update" || !originalDoc?.id || bypassed(req)) {
    return data;
  }
  const incoming = data as Record<string, unknown> | undefined;
  const original = originalDoc as Record<string, unknown>;
  // Moving to the trash is a delete, not an update or a publish.
  const trashing = isTrashing(incoming, original);
  const publishing = !trashing && isPublishing(collection, incoming, original);
  const merged = { ...originalDoc, ...data } as Record<string, unknown>;
  for (const guard of await holdingOn(req, collection.slug, originalDoc.id, merged)) {
    const refused = trashing
      ? holds(guard, "delete")
      : holds(guard, "update") || (publishing && holds(guard, "publish"));
    if (refused) {
      throw refusal(guard);
    }
  }
  return data;
};

const guardDelete: CollectionBeforeDeleteHook = async ({ collection, id, req }) => {
  if (bypassed(req)) {
    return;
  }
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
  for (const guard of await holdingOn(req, collection.slug, id, doc)) {
    if (holds(guard, "delete")) {
      throw refusal(guard);
    }
  }
};

// ---- Following the document -----------------------------------------------------------------

const startsOnCreate = (start: StartMode | undefined, doc: Record<string, unknown>): boolean => {
  if (start === "onCreate") {
    return true;
  }
  return typeof start === "object" && start.on === "create" && start.when({ doc });
};

const logged = (req: PayloadRequest, msg: string, error: unknown) =>
  req.payload.logger.error({ err: error, msg: `workflows: ${msg}` });

/** Ends a document's active runs, as the system. Never throws. */
const abortRuns = async (req: PayloadRequest, collection: string, id: string | number) => {
  try {
    for (const run of await activeRuns(req, collection, id)) {
      try {
        await abortRun(req, { instanceId: run.id, reason: "Subject deleted", user: null });
      } catch (error) {
        logged(req, `could not abort run ${run.id}`, error);
      }
    }
  } catch (error) {
    logged(req, `could not load runs of ${collection} ${id}`, error);
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
  if (operation === "create") {
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
        logged(req, `could not start "${def.name}" on ${collection.slug} ${doc.id}`, error);
      }
    }
    return doc;
  }
  if (isTrashing(subject, previousDoc as Record<string, unknown> | undefined)) {
    await abortRuns(req, collection.slug, doc.id);
    return doc;
  }
  const jobs: JobId[] = [];
  try {
    for (const run of await activeRuns(req, collection.slug, doc.id)) {
      try {
        jobs.push(...(await settleRun(req, run, subject)).jobs);
      } catch (error) {
        logged(req, `could not settle run ${run.id}`, error);
      }
    }
  } catch (error) {
    logged(req, `could not load runs of ${collection.slug} ${doc.id}`, error);
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
