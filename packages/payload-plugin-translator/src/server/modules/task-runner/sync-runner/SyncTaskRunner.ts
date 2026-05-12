import type { Payload, CollectionSlug } from 'payload'

import type { TaskRunner } from '../TaskRunner.interface'
import type { TaskHandler } from '../TaskRunnerProvider.interface'
import type { Task, TaskInput, RunResult } from '../types'
import type { LazyMap } from '../../../shared/utils'

/**
 * Synchronous TaskRunner implementation.
 *
 * Executes translations immediately without queuing.
 * Stores results in memory for status queries.
 */
export class SyncTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly handler: TaskHandler,
    private readonly tasks: LazyMap<string, Task>,
  ) {}

  async enqueue(inputs: TaskInput[]): Promise<void> {
    for (const input of inputs) {
      const key = this.getKey(input.collectionSlug, input.collectionId)
      const now = new Date().toISOString()

      const task: Task = {
        id: crypto.randomUUID(),
        status: 'running',
        input,
        createdAt: now,
        updatedAt: now,
        cancelled: false,
      }

      this.tasks.set(key, task)

      try {
        await this.handler(this.payload, {
          collection: input.collectionSlug,
          collectionId: input.collectionId,
          sourceLng: input.sourceLng,
          targetLng: input.targetLng,
          strategy: input.strategy,
          publishOnTranslation: input.publishOnTranslation,
        })

        task.status = 'completed'
        task.completedAt = new Date().toISOString()
      } catch (error) {
        task.status = 'failed'
        task.error = {
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      }

      task.updatedAt = new Date().toISOString()
    }
  }

  async cancel(_taskIds: string[]): Promise<void> {
    // No-op: synchronous tasks execute immediately and cannot be cancelled
  }

  async run(_taskId: string): Promise<RunResult> {
    // Sync runner executes tasks immediately, no pending tasks to run
    return { success: false, error: 'not_found' }
  }

  async findByCollection(collectionSlug: CollectionSlug, documentIds?: Array<string | number>): Promise<Task[]> {
    const results: Task[] = []

    for (const [, task] of this.tasks) {
      if (task.input.collectionSlug !== collectionSlug) continue
      if (documentIds && !documentIds.includes(task.input.collectionId)) continue
      results.push(task)
    }

    return results
  }

  private getKey(collectionSlug: CollectionSlug, collectionId: string | number): string {
    return `${collectionSlug}:${collectionId}`
  }
}
