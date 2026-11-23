// Effects run as Payload jobs, queued in the same transaction as the change that caused them
// (store.ts). This is the job: run the registered handler, record the outcome in the run's
// history, and apply the `{ set }` it may report back.

import type { PayloadRequest, TaskConfig } from "payload";

import { EFFECT_TASK, TICK_TASK } from "../constants.js";
import { patchFields } from "../engine/engine.js";
import type { HistoryEntry, Patch, WorkflowDefinition } from "../types.js";
import { loadSubject, presentRun, settingsOf, tickWorkflows } from "./operations.js";
import { loadRun, mutateRun, subjectOf } from "./store.js";

interface EffectInput {
  instanceId: string;
  effect: string;
  activity: string;
  action: string;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Appends the effect's outcome to the run's history and, if it reported back, applies `set`. */
const record = (
  req: PayloadRequest,
  def: WorkflowDefinition | undefined,
  input: EffectInput,
  outcome: { status: "done" | "failed"; error?: string },
  subject: Record<string, unknown> | null,
  set?: Patch
) =>
  mutateRun(req, def, input.instanceId, (state) => {
    const entry: HistoryEntry = {
      at: new Date().toISOString(),
      actor: { system: true },
      type: "effect",
      effect: input.effect,
      status: outcome.status,
      ...(outcome.error ? { error: outcome.error } : {}),
    };
    const recorded = { ...state, history: [...state.history, entry] };
    if (!set || Object.keys(set).length === 0) {
      return { state: recorded, effects: [] };
    }
    if (!def || state.status !== "active") {
      req.payload.logger.warn(
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
const runEffect = async (req: PayloadRequest, input: EffectInput): Promise<void> => {
  const { payload } = req;
  const settings = settingsOf(payload);
  const doc = await loadRun(req, input.instanceId);
  const def = settings.workflows.find((entry) => entry.name === doc.workflow);
  const subject = await loadSubject(req, subjectOf(doc), null);
  let result: Awaited<ReturnType<(typeof settings.effects)[string]>>;
  try {
    const handler = settings.effects[input.effect];
    if (!handler) {
      throw new Error(`No handler is registered for effect "${input.effect}".`);
    }
    result = await handler({
      payload,
      req,
      instance: await presentRun(req, doc, subject, null),
      doc: subject,
      effect: { name: input.effect, activity: input.activity, action: input.action },
    });
  } catch (error) {
    try {
      await record(req, def, input, { status: "failed", error: messageOf(error) }, subject);
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
    await record(req, def, input, { status: "done" }, subject, result?.set);
  } catch (error) {
    // The handler did its work; a `set` the definition rejects is recorded, not retried.
    payload.logger.error({
      err: error,
      msg: `workflows: effect "${input.effect}" could not apply its result`,
    });
    await record(req, def, input, { status: "failed", error: messageOf(error) }, subject);
  }
};

const text = (name: string) => ({ name, type: "text" as const, required: true });

export const effectTask: TaskConfig = {
  slug: EFFECT_TASK,
  label: "Workflow effect",
  // Retries after the first failure.
  retries: 2,
  inputSchema: [text("instanceId"), text("effect"), text("activity"), text("action")],
  handler: async ({ input, req }) => {
    await runEffect(req, input as unknown as EffectInput);
    return { output: {} };
  },
};

/** Not scheduled by the plugin: queue it from your own schedule if a condition reads `now`. */
export const tickTask: TaskConfig = {
  slug: TICK_TASK,
  label: "Workflow tick",
  handler: async ({ req }) => {
    await tickWorkflows(req.payload);
    return { output: {} };
  },
};
