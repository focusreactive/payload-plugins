import type { Config, Payload } from "payload";
import type { TaskRunner } from "./TaskRunner.interface.js";
import type { RunnerCapabilities } from "./RunnerCapabilities.js";
import type { JobHandle, RunRef, TaskEvent } from "./types.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";

/**
 * Input for task handler callback
 */
/**
 * What a runner hands back about one piece of work it has tried.
 *
 * @since 1.0.0
 */
export type TaskHandlerInput = {
  handle: JobHandle;
  targetLng: string;
  /** Zero on the first attempt, and on any runner that does not retry. */
  previousAttempts: number;
};

/**
 * Task handler callback — plugin passes its internal logic
 */
export type TaskHandler = (
  payload: Payload,
  input: TaskHandlerInput,
  scope?: RequestScope
) => Promise<void>;

/**
 * Context for runner configuration
 */
export type TaskRunnerContext = {
  handler: TaskHandler;
  /**
   * Tell the plugin what became of one assignment — the only road to the host; a runner that never
   * calls this leaves its host hearing nothing.
   *
   * - `queued` when the work is accepted, then at most one terminal event per assignment.
   * - Every `queued` is sent before `enqueue` resolves, every `cancelled` before `cancel` resolves.
   * - The reference carries the handle the enqueue answer gave for that locale.
   * - One `queued` per locale the enqueue answered; terminal events are counted per locale.
   * - `cancelled` only ever follows a `cancel`; a locale already reported `failed` is settled and is
   *   not owed.
   *
   * A failing `queued` report leaves the run unrecorded: let it out of `enqueue` rather than
   * logging it — `assertTaskRunnerContract` asserts this.
   *
   * `scope` joins the write to the caller's transaction; pass the one `enqueue` or `cancel` was given.
   * @since 0.16.0
   * @since 1.0.0
   */
  report: (payload: Payload, run: RunRef, event: TaskEvent, scope?: RequestScope) => Promise<void>;
};

/**
 * The runtime half of a runner: produces a `TaskRunner` for one request.
 *
 * Routes depend on this narrow surface — they only ever `create()`, never
 * `configure()`. The plugin binds the {@link TaskRunnerContext} once at build
 * time and hands routes a factory, so a `create()` call needs no ambient state.
 */
export type TaskRunnerFactory = {
  create(payload: Payload): TaskRunner;
  capabilities: RunnerCapabilities;
};

/**
 * Main interface for pluggable task runner providers.
 *
 * Implementations handle their own initialization (jobs, queues, etc.)
 * and provide runtime operations.
 *
 * Built-in implementation: createPayloadJobsRunner (uses Payload Jobs)
 * Future implementations: createInngestRunner, createQStashRunner
 */
export interface TaskRunnerProvider {
  /**
   * What `create` returns can do beyond accepting work — see {@link RunnerCapabilities}.
   *
   * @since 1.0.0
   */
  capabilities: RunnerCapabilities;

  /**
   * Creates a TaskRunner instance for runtime operations (enqueue, cancel, find).
   *
   * `handler` is supplied by the caller at create time (the plugin binds it
   * into a {@link TaskRunnerFactory}) — so providers hold no mutable per-instance
   * state and `create()` does not depend on `configure()` having run. It is the
   * only runtime dependency (collection metadata is a `configure()`-time concern).
   * `PayloadJobsRunner` ignores it (the handler is baked into the registered
   * task at configure time); `SyncRunner` uses it to run translations inline.
   */
  create(payload: Payload, context: TaskRunnerContext): TaskRunner;

  /**
   * Configures the runner and returns a Payload config modifier.
   * The modifier adds necessary tasks, jobs, queues to Payload config.
   * Implementations may also install a `config.onInit` hook for boot-time initialization (e.g. stale-lock recovery).
   */
  configure(context: TaskRunnerContext): (config: Config) => Config;
}
