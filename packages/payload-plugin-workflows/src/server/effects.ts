import type { PayloadRequest, TaskConfig } from "payload";

import { patchFields } from "../engine/operations.js";
import { EFFECT_RETRIES, EFFECT_TASK, JOBS_QUEUE, TICK_TASK } from "../lib/constants.js";
import type { HistoryEntry, Patch, Result } from "../types.js";
import { mutateInstance } from "./commit.js";
import type { Ctx } from "./commit.js";
import { resolvedOf } from "./config.js";
import { presentInstance } from "./present.js";
import { loadInstance, subjectOf } from "./store.js";
import { loadSubject } from "./subject.js";
import { tickWorkflows } from "./tick.js";

export interface EffectInput {
  instanceId: string;
  effect: string;
  activity: string;
  action: string;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Appends the effect's outcome to the run's history and, if it reported back, applies `set`. */
const record = async (
  ctx: Ctx,
  input: EffectInput,
  outcome: { status: "done" | "failed"; error?: string },
  subject: Record<string, unknown> | null,
  set?: Patch
) =>
  mutateInstance(ctx, input.instanceId, (_doc, state): Result => {
    const entry: HistoryEntry = {
      at: new Date().toISOString(),
      actor: { system: true },
      type: "effect",
      effect: input.effect,
      status: outcome.status,
      ...(outcome.error ? { error: outcome.error } : {}),
    };
    const recorded = { ...state, history: [...state.history, entry] };
    const def = ctx.resolved.definitions.find((candidate) => candidate.name === state.workflow);
    if (!set || Object.keys(set).length === 0) {
      return { state: recorded, effects: [] };
    }
    if (!def || state.status !== "active") {
      ctx.payload.logger.warn(
        `workflows: effect "${input.effect}" reported fields for run ${input.instanceId}, which is no longer active; ignored`
      );
      return { state: recorded, effects: [] };
    }
    return patchFields(def, recorded, set, { doc: subject, now: new Date() });
  });

/**
 * One effect job: run the registered handler, then record it. A throwing handler is recorded as
 * `failed` and rethrown so Payload retries the job. At least once: a retry runs the handler again.
 */
export const runEffect = async (req: PayloadRequest, input: EffectInput): Promise<void> => {
  const { payload } = req;
  const ctx: Ctx = { payload, req, resolved: resolvedOf(payload) };
  const doc = await loadInstance(payload, ctx.resolved.instancesSlug, input.instanceId, req);
  const subject = await loadSubject(payload, subjectOf(doc), null, req);
  let result: Awaited<ReturnType<NonNullable<(typeof ctx.resolved.effects)[string]>>>;
  try {
    const handler = ctx.resolved.effects[input.effect];
    if (!handler) {
      throw new Error(`No handler is registered for effect "${input.effect}".`);
    }
    result = await handler({
      payload,
      req,
      instance: await presentInstance(ctx, doc, null, subject),
      doc: subject,
      effect: { name: input.effect, activity: input.activity, action: input.action },
    });
  } catch (error) {
    try {
      await record(ctx, input, { status: "failed", error: messageOf(error) }, subject);
    } catch (recordError) {
      // Never hide the handler's error behind ours: it is what the job's log must show.
      payload.logger.error({
        err: recordError,
        msg: `workflows: could not record the failure of effect "${input.effect}" on run ${input.instanceId}`,
      });
    }
    throw error;
  }
  try {
    await record(ctx, input, { status: "done" }, subject, result?.set);
  } catch (error) {
    // The handler did its work; a `set` the definition rejects is recorded, not retried.
    payload.logger.error({
      err: error,
      msg: `workflows: effect "${input.effect}" could not apply its result`,
    });
    await record(ctx, input, { status: "failed", error: messageOf(error) }, subject);
  }
};

const text = (name: string) => ({ name, type: "text" as const, required: true });

export const effectTask: TaskConfig = {
  slug: EFFECT_TASK,
  label: "Workflow effect",
  retries: EFFECT_RETRIES,
  inputSchema: [text("instanceId"), text("effect"), text("activity"), text("action")],
  handler: async ({ input, req }) => {
    await runEffect(req, input as unknown as EffectInput);
    return { output: {} };
  },
};

export const tickTask = (cron?: string): TaskConfig => ({
  slug: TICK_TASK,
  label: "Workflow tick",
  handler: async ({ req }) => {
    await tickWorkflows(req.payload);
    return { output: {} };
  },
  ...(cron ? { schedule: [{ cron, queue: JOBS_QUEUE }] } : {}),
});
