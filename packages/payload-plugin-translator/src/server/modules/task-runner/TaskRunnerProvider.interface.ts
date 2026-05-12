import type { CollectionSlug, Config, Payload } from 'payload'
import type { TaskRunner } from './TaskRunner.interface'
import type { TranslationStrategyName } from '../translation-pipeline/strategies'

/**
 * Input for task handler callback
 */
export type TaskHandlerInput = {
  collection: CollectionSlug
  collectionId: string | number
  sourceLng: string
  targetLng: string
  strategy: TranslationStrategyName
  publishOnTranslation: boolean
}

/**
 * Task handler callback — plugin passes its internal logic
 */
export type TaskHandler = (payload: Payload, input: TaskHandlerInput) => Promise<void>

/**
 * Context for runner configuration
 */
export type TaskRunnerContext = {
  handler: TaskHandler
  collections: CollectionSlug[]
}

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
   */
  create(payload: Payload): TaskRunner

  /**
   * Configures the runner and returns a Payload config modifier.
   * The modifier adds necessary tasks, jobs, queues to Payload config.
   */
  configure(context: TaskRunnerContext): (config: Config) => Config
}
