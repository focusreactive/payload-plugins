import type { CollectionSlug, Config, Payload } from "payload";
import type { TaskRunner } from "./TaskRunner.interface";
import type { ID } from "./types";
import type { TranslationStrategyName } from "../../../core/translation-pipeline/strategies";

/**
 * Input for task handler callback
 */
export type TaskHandlerInput = {
  collection: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  strategy: TranslationStrategyName;
  publishOnTranslation: boolean;
};

/**
 * Task handler callback — plugin passes its internal logic
 */
export type TaskHandler = (payload: Payload, input: TaskHandlerInput) => Promise<void>;

/**
 * Context for runner configuration
 */
export type TaskRunnerContext = {
  handler: TaskHandler;
  collections: CollectionSlug[];
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
   * Creates a TaskRunner instance for runtime operations (enqueue, cancel, find).
   *
   * `handler` is supplied by the caller at create time (the plugin binds it
   * into a {@link TaskRunnerFactory}) — so providers hold no mutable per-instance
   * state and `create()` does not depend on `configure()` having run. It is the
   * only runtime dependency (collection metadata is a `configure()`-time concern).
   * `PayloadJobsRunner` ignores it (the handler is baked into the registered
   * task at configure time); `SyncRunner` uses it to run translations inline.
   */
  create(payload: Payload, handler: TaskHandler): TaskRunner;

  /**
   * Configures the runner and returns a Payload config modifier.
   * The modifier adds necessary tasks, jobs, queues to Payload config.
   * Implementations may also install a `config.onInit` hook for boot-time initialization (e.g. stale-lock recovery).
   */
  configure(context: TaskRunnerContext): (config: Config) => Config;
}
