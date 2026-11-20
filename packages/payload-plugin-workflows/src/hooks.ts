import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { APIError } from "payload";

import { holdingGuards } from "./engine/guards.js";
import { WORKFLOW_BYPASS } from "./lib/constants.js";
import type { GuardDef, GuardOperation, StartMode, WorkflowDefinition } from "./types.js";
import type { Ctx, JobId } from "./server/commit.js";
import { resolvedOf } from "./server/config.js";
import { runJobsInline } from "./server/inline.js";
import { abortIn, canRunInline, settleIn, startIn } from "./server/operations.js";
import { SETTLE_SELECT, findInstances, subjectWhere, toState } from "./server/store.js";

const ctxOf = (req: PayloadRequest): Ctx => ({
  payload: req.payload,
  req,
  resolved: resolvedOf(req.payload),
});

/** One query for a document's active runs, without their history (not needed to guard or settle). */
const activeRuns = (ctx: Ctx, collection: string, id: string | number) =>
  findInstances(
    ctx.payload,
    ctx.resolved.instancesSlug,
    subjectWhere({ collection, id: String(id) }, true),
    ctx.req,
    SETTLE_SELECT
  );

/** Guards holding on a document right now, across all its active runs. */
const holdingOn = async (
  req: PayloadRequest,
  collection: string,
  id: string | number,
  doc: Record<string, unknown> | null
): Promise<GuardDef[]> => {
  const ctx = ctxOf(req);
  const holding: GuardDef[] = [];
  for (const run of await activeRuns(ctx, collection, id)) {
    const def = ctx.resolved.definitions.find((entry) => entry.name === run.workflow);
    if (def) {
      holding.push(...holdingGuards(def, toState(run), { doc, now: new Date() }));
    }
  }
  return holding;
};

const blocked = (guard: GuardDef) => new APIError(guard.title ?? guard.name, 403, null, true);

const hasDrafts = (collection: CollectionConfig): boolean =>
  Boolean(
    collection.versions && typeof collection.versions === "object" && collection.versions.drafts
  );

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
      throw blocked(guard);
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
      throw blocked(guard);
    }
  }
};

const startsOnCreate = (start: StartMode | undefined, doc: Record<string, unknown>): boolean => {
  if (start === "onCreate") {
    return true;
  }
  return typeof start === "object" && start.on === "create" && start.when({ doc });
};

const logged = (req: PayloadRequest, msg: string, error: unknown) =>
  req.payload.logger.error({ err: error, msg: `workflows: ${msg}` });

/** Ends a document's active runs, as the system. Never throws. */
const abortRuns = async (
  req: PayloadRequest,
  collection: string,
  id: string | number,
  reason: string
) => {
  try {
    const ctx = ctxOf(req);
    for (const run of await activeRuns(ctx, collection, id)) {
      try {
        await abortIn(ctx, { instanceId: run.id, reason, user: null });
      } catch (error) {
        logged(req, `could not abort run ${run.id}`, error);
      }
    }
  } catch (error) {
    logged(req, `could not load runs of ${collection} ${id}`, error);
  }
};

// Never throws: a workflow bug must not break saving content.
const followChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const ctx = ctxOf(req);
  const subject = doc as Record<string, unknown>;
  if (operation === "create") {
    const starting = ctx.resolved.definitions.filter((def: WorkflowDefinition) =>
      def.collections.includes(collection.slug)
    );
    for (const def of starting) {
      try {
        if (startsOnCreate(def.start, subject)) {
          // Runs its effects inline only when the save has no transaction (see `canRunInline`).
          await startIn(ctx, {
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
    await abortRuns(req, collection.slug, doc.id, "Subject deleted");
    return doc;
  }
  const jobs: JobId[] = [];
  try {
    for (const run of await activeRuns(ctx, collection.slug, doc.id)) {
      try {
        jobs.push(...(await settleIn(ctx, run, subject)).jobs);
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

const abortOnDelete: CollectionAfterDeleteHook = async ({ collection, id, req }) =>
  abortRuns(req, collection.slug, id, "Subject deleted");

/** Guards (enforced for every writer), auto-start, settle-on-save and abort-on-delete. */
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
