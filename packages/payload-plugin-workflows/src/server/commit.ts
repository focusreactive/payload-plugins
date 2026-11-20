import type { CollectionSlug, Payload, PayloadRequest } from "payload";
import { commitTransaction, initTransaction, killTransaction, ValidationError } from "payload";

import { WorkflowError } from "../engine/errors.js";
import { COMMIT_ATTEMPTS, EFFECT_TASK, JOBS_QUEUE, QUEUED_JOBS } from "../lib/constants.js";
import type { ResolvedWorkflows } from "../options.js";
import type { InstanceState, QueuedEffect, Result, WorkflowDefinition } from "../types.js";
import { loadInstance, subjectOf, toData, toState } from "./store.js";
import type { InstanceDoc, Subject } from "./store.js";

export interface Ctx {
  payload: Payload;
  req: PayloadRequest;
  resolved: ResolvedWorkflows;
}

export type JobId = string | number;

export interface Committed {
  doc: InstanceDoc;
  /** Effect jobs queued by this commit. */
  jobs: JobId[];
}

/** Runs `fn` in a transaction — its own when `req` has none, the caller's otherwise. */
const inTransaction = async <T>(req: PayloadRequest, fn: () => Promise<T>): Promise<T> => {
  const owns = await initTransaction(req);
  try {
    const result = await fn();
    if (owns) {
      await commitTransaction(req);
    }
    return result;
  } catch (error) {
    if (owns) {
      await killTransaction(req);
    }
    throw error;
  }
};

type QueueEffect = (args: {
  task: string;
  queue: string;
  input: Record<string, string>;
  req: PayloadRequest;
}) => Promise<{ id: JobId }>;

/**
 * Queues one effect job per effect with the same `req`, so the state change and its effects commit
 * together (an outbox). The ids are also reported to an inline run in progress, if any.
 */
const queueEffects = async (
  { payload, req }: Ctx,
  instanceId: JobId,
  effects: QueuedEffect[]
): Promise<JobId[]> => {
  const queue = payload.jobs.queue as unknown as QueueEffect;
  const ids: JobId[] = [];
  for (const effect of effects) {
    const job = await queue({
      task: EFFECT_TASK,
      queue: JOBS_QUEUE,
      input: {
        instanceId: String(instanceId),
        effect: effect.name,
        activity: effect.activity,
        action: effect.action,
      },
      req,
    });
    ids.push(job.id);
  }
  const collector = req.context?.[QUEUED_JOBS];
  if (Array.isArray(collector)) {
    collector.push(...ids);
  }
  return ids;
};

const definitionFor = (ctx: Ctx, name: string): WorkflowDefinition | undefined =>
  ctx.resolved.definitions.find((def) => def.name === name);

const isActiveKeyClash = (error: unknown): boolean =>
  error instanceof ValidationError &&
  (error.data?.errors ?? []).some((entry) => entry.path === "activeKey");

/** Inserts a new run. A second active run of the same workflow on the same document is refused. */
export const createInstance = async (
  ctx: Ctx,
  result: Result,
  subject: Subject
): Promise<Committed> => {
  const def = definitionFor(ctx, result.state.workflow);
  try {
    return await inTransaction(ctx.req, async () => {
      const doc = (await ctx.payload.create({
        collection: ctx.resolved.instancesSlug as CollectionSlug,
        data: { ...toData(result.state, def, subject), revision: 1 } as never,
        depth: 0,
        overrideAccess: true,
        req: ctx.req,
      })) as unknown as InstanceDoc;
      return { doc, jobs: await queueEffects(ctx, doc.id, result.effects) };
    });
  } catch (error) {
    if (isActiveKeyClash(error)) {
      throw new WorkflowError(
        "already-running",
        `Workflow "${result.state.workflow}" is already running on this document.`
      );
    }
    throw error;
  }
};

/**
 * Optimistic concurrency: load, compute, then write only if `revision` is still what was read — a
 * compare-and-swap in the database adapter (`db.updateOne` with a `where`). A lost race reloads and
 * re-runs the whole computation on fresh state; after the last attempt it is `conflict`.
 *
 * `compute` returning `null` or the state it was given means "nothing to write".
 */
export const mutateInstance = async (
  ctx: Ctx,
  instanceId: JobId,
  compute: (doc: InstanceDoc, state: InstanceState) => Promise<Result | null> | Result | null
): Promise<Committed> => {
  const slug = ctx.resolved.instancesSlug;
  for (let attempt = 0; attempt < COMMIT_ATTEMPTS; attempt += 1) {
    const outcome = await inTransaction(ctx.req, async (): Promise<Committed | null> => {
      const doc = await loadInstance(ctx.payload, slug, instanceId, ctx.req);
      const state = toState(doc);
      const result = await compute(doc, state);
      if (!result || result.state === state) {
        return { doc, jobs: [] };
      }
      const updated = await ctx.payload.db.updateOne({
        collection: slug,
        where: { and: [{ id: { equals: doc.id } }, { revision: { equals: doc.revision } }] },
        data: {
          ...toData(result.state, definitionFor(ctx, doc.workflow), subjectOf(doc)),
          revision: doc.revision + 1,
          updatedAt: new Date().toISOString(),
        },
        req: ctx.req,
      });
      if (!updated) {
        return null;
      }
      return {
        doc: updated as unknown as InstanceDoc,
        jobs: await queueEffects(ctx, doc.id, result.effects),
      };
    });
    if (outcome) {
      return outcome;
    }
  }
  throw new WorkflowError(
    "conflict",
    "The workflow run was changed by someone else at the same time. Reload and try again."
  );
};
