import type { Payload, Where, CollectionSlug } from 'payload'

import type { TaskRunner } from '../TaskRunner.interface'
import type { Task, TaskInput, RunResult } from '../types'
import type { PayloadJobsRunnerConfig, PayloadJob } from './types'
import { normalizeJob } from './normalizeJob'

/**
 * TaskRunner implementation using Payload Jobs.
 *
 * Handles queuing, cancellation, status tracking, and execution of translation tasks.
 */
export class PayloadJobsTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly config: PayloadJobsRunnerConfig,
  ) {}

  async enqueue(tasks: TaskInput[]): Promise<void> {
    const byCollection = this.groupByCollection(tasks)

    for (const [collectionSlug, items] of byCollection) {
      const documentIds = items.map((t) => t.collectionId)
      const existing = await this.findJobsInternal({
        and: [
          { 'input.collection.relationTo': { equals: collectionSlug } },
          { 'input.collection.value': { in: documentIds } },
        ],
      })
      if (existing.length > 0) {
        await this.cancelInternal(existing.map((t) => t.id))
      }
    }

    await Promise.all(
      tasks.map((task) =>
        this.payload.jobs.queue({
          task: this.config.taskName,
          queue: this.config.queueName,
          input: {
            collection: {
              relationTo: task.collectionSlug,
              value: task.collectionId,
            },
            source_lng: task.sourceLng,
            target_lng: task.targetLng,
            strategy: task.strategy,
            publish_on_translation: task.publishOnTranslation,
          },
        }),
      ),
    )
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return
    await this.cancelInternal(taskIds)
  }

  async run(taskId: string): Promise<RunResult> {
    const tasks = await this.findJobsInternal({ id: { equals: taskId } }, { limit: 1 })
    const task = tasks[0]

    if (!task) {
      return { success: false, error: 'not_found' }
    }
    if (task.completedAt) {
      return { success: false, error: 'already_completed' }
    }
    if (task.status === 'running') {
      return { success: false, error: 'already_running' }
    }

    this.payload.jobs.runByID({ id: taskId })
    return { success: true }
  }

  async findByCollection(collectionSlug: CollectionSlug, documentIds?: Array<string | number>): Promise<Task[]> {
    const where: Where = documentIds?.length
      ? {
          and: [
            { 'input.collection.relationTo': { equals: collectionSlug } },
            { 'input.collection.value': { in: documentIds } },
          ],
        }
      : { 'input.collection.relationTo': { equals: collectionSlug } }

    return this.findJobsInternal(where, { pagination: false })
  }

  /**
   * Group tasks by collection slug
   */
  private groupByCollection(tasks: TaskInput[]): Map<CollectionSlug, TaskInput[]> {
    const map = new Map<CollectionSlug, TaskInput[]>()
    for (const task of tasks) {
      const existing = map.get(task.collectionSlug) ?? []
      existing.push(task)
      map.set(task.collectionSlug, existing)
    }
    return map
  }

  /**
   * Internal cancel implementation
   */
  private async cancelInternal(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return

    await this.payload.jobs.cancel({
      where: { id: { in: taskIds } },
      queue: this.config.queueName,
    })

    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { id: { in: taskIds } },
    })
  }

  /**
   * Internal method to find jobs with where clause
   */
  private async findJobsInternal(where: Where, params?: { limit?: number; pagination?: boolean }): Promise<Task[]> {
    const response = await this.payload.find({
      collection: this.config.jobsCollection,
      limit: params?.limit,
      pagination: params?.pagination,
      where: {
        and: [{ taskSlug: { equals: this.config.taskName } }, where],
      },
    })

    return (response.docs as PayloadJob[]).map(normalizeJob)
  }
}
