import type { Config, Payload } from 'payload'

import type { TaskRunner } from '../TaskRunner.interface'
import type { TaskRunnerProvider, TaskRunnerContext, TaskHandler } from '../TaskRunnerProvider.interface'
import type { Task } from '../types'
import type { SyncRunnerOptions } from './types'
import { SyncTaskRunner } from './SyncTaskRunner'
import { LazyMap } from '../../../shared/utils'

const DEFAULT_MAX_SIZE = 100
const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Synchronous TaskRunnerProvider implementation.
 *
 * Executes translations immediately without Payload Jobs.
 * Useful for development, testing, or simple use cases.
 */
export class SyncRunnerProvider implements TaskRunnerProvider {
  private handler?: TaskHandler
  private readonly tasks: LazyMap<string, Task>

  constructor(options?: SyncRunnerOptions) {
    const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE
    const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS

    this.tasks = new LazyMap<string, Task>({
      maxSize,
      ttlMs,
      isRemovable: (task) => task.status === 'completed' || task.status === 'failed',
      getTimestamp: (task) => new Date(task.updatedAt).getTime(),
    })
  }

  create(payload: Payload): TaskRunner {
    if (!this.handler) throw new Error('SyncRunnerProvider not configured. Call configure() first.')
    return new SyncTaskRunner(payload, this.handler, this.tasks)
  }

  configure(context: TaskRunnerContext): (config: Config) => Config {
    this.handler = context.handler
    return (config) => config
  }
}

/**
 * Creates a synchronous TaskRunnerProvider.
 *
 * Executes translations immediately without queuing.
 * Results are stored in memory and lost on server restart.
 */
export function createSyncRunner(options?: SyncRunnerOptions): TaskRunnerProvider {
  return new SyncRunnerProvider(options)
}
