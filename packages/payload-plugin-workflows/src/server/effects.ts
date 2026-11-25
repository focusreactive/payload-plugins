// Effects run as Payload jobs, queued in the same transaction as the change that caused them
// (store.ts). This is the job: run the registered handler, record the outcome in the run's
// history, and apply the `{ set }` it may report back.

import type { PayloadRequest, TaskConfig } from "payload";

import { EFFECT_TASK, TICK_TASK } from "../constants.js";
import { recordEffect } from "../engine/engine.js";
import { isWorkflowError } from "../engine/errors.js";
import type { WorkflowDefinition } from "../types.js";
import { loadSubject, presentRun, settingsOf, tickWorkflows } from "./operations.js";
import { loadRun, mutateRun, subjectOf } from "./store.js";

interface EffectInput {
  instanceId: string;
  effect: string;
  activity: string;
  action: string;
  /** The stage visit that queued it (absent on jobs queued before visits were recorded). */
  stage?: string;
  visit?: string;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Attempts at recording an outcome. Effects of one run that finish together all write that run,
 * so recording retries on its own (with jitter) instead of failing the job: a retried job would
 * run its handler again.
 */
const RECORD_ATTEMPTS = 25;

/** Appends the effect's outcome to the run's history and applies its `set` (`recordEffect`). */
const record = (
  req: PayloadRequest,
  def: WorkflowDefinition | undefined,
  input: EffectInput,
  outcome: Parameters<typeof recordEffect>[3],
  subject: Record<string, unknown> | null
) =>
  mutateRun(
    req,
    def,
    input.instanceId,
    (state) =>
      recordEffect(
        def,
        state,
        {
          name: input.effect,
          ...(input.stage === undefined ? {} : { stage: input.stage }),
          ...(input.visit ? { visit: Number(input.visit) } : {}),
        },
        outcome,
        // One time for the outcome and what it moves, so the history reads them as one step.
        { doc: subject, now: new Date() }
      ),
    RECORD_ATTEMPTS
  );

/**
 * One effect job: run the registered handler, then record it. A throwing handler is recorded as
 * `failed` and rethrown so Payload retries the job. Once the handler has succeeded nothing throws,
 * so it is never run again because recording its outcome failed. At least once: a retry after a
 * failure, or a crash before the job is marked done, runs the handler again.
 */
const runEffect = async (req: PayloadRequest, input: EffectInput): Promise<void> => {
  const { payload } = req;
  const settings = settingsOf(payload);
  const doc = await loadRun(req, input.instanceId);
  const def = settings.workflows.find((entry) => entry.name === doc.workflow);
  const subject = await loadSubject(req, subjectOf(doc), null);
  const unrecorded = (error: unknown, what: string) =>
    payload.logger.error({
      err: error,
      msg: `workflows: could not record ${what} of effect "${input.effect}" on run ${input.instanceId}`,
    });
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
      effect: {
        name: input.effect,
        activity: input.activity,
        action: input.action,
        stage: input.stage ?? doc.stage,
        visit: Number(input.visit ?? 0),
      },
    });
  } catch (error) {
    try {
      await record(req, def, input, { status: "failed", error: messageOf(error) }, subject);
    } catch (recordError) {
      // Never hide the handler's error behind ours: it is what the job's log must show.
      unrecorded(recordError, "the failure");
    }
    throw error;
  }
  try {
    await record(
      req,
      def,
      input,
      { status: "done", ...(result?.set ? { set: result.set } : {}) },
      subject
    );
  } catch (error) {
    if (isWorkflowError(error) && error.code === "conflict") {
      unrecorded(error, "the outcome");
      return;
    }
    // The handler did its work; a `set` the definition rejects is recorded, not retried.
    payload.logger.error({
      err: error,
      msg: `workflows: effect "${input.effect}" could not apply its result`,
    });
    try {
      await record(req, def, input, { status: "failed", error: messageOf(error) }, subject);
    } catch (recordError) {
      unrecorded(recordError, "the failure");
    }
  }
};

const text = (name: string, required = true) => ({ name, type: "text" as const, required });

/**
 * The effect job. With `jobs.enableConcurrencyControl` on in the host's config, the effects of one
 * run are serialised (Payload's concurrency key, per run): they no longer race to record.
 */
export const effectTask = (serialise: boolean): TaskConfig => ({
  slug: EFFECT_TASK,
  label: "Workflow effect",
  // Retries after the first failure.
  retries: 2,
  inputSchema: [
    text("instanceId"),
    text("effect"),
    text("activity"),
    text("action"),
    text("stage", false),
    text("visit", false),
  ],
  ...(serialise
    ? {
        concurrency: ({ input }: { input?: object }) =>
          `${EFFECT_TASK}:${(input as Partial<EffectInput> | undefined)?.instanceId ?? ""}`,
      }
    : {}),
  handler: async ({ input, req }) => {
    await runEffect(req, input as unknown as EffectInput);
    return { output: {} };
  },
});

/** Not scheduled by the plugin: queue it from your own schedule if a condition reads `now`. */
export const tickTask: TaskConfig = {
  slug: TICK_TASK,
  label: "Workflow tick",
  handler: async ({ req }) => {
    await tickWorkflows(req.payload);
    return { output: {} };
  },
};
