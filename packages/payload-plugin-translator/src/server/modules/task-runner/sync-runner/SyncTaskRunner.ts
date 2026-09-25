import type { Payload, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface.js";
import { toTaskFilter } from "../toTaskFilter.js";
import type { TaskHandler } from "../TaskRunnerProvider.interface.js";
import type { Task, TaskInput, RunResult, ID } from "../types.js";
import type { LazyMap } from "../../../shared/utils/index.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { killedTheCallersTransaction } from "../../../shared/payload/RequestScope.shapes.js";

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
    private readonly tasks: LazyMap<string, Task>
  ) {}

  async enqueue(inputs: TaskInput[], scope: RequestScope = {}): Promise<void> {
    for (const input of inputs) {
      const key = this.getKey(input.collectionSlug, input.collectionId, input.targetLng);
      const now = new Date().toISOString();

      const task: Task = {
        id: crypto.randomUUID(),
        status: "running",
        input,
        createdAt: now,
        updatedAt: now,
        cancelled: false,
      };

      this.tasks.set(key, task);

      try {
        await this.handler(
          this.payload,
          {
            collection: input.collectionSlug,
            collectionId: input.collectionId,
            sourceLng: input.sourceLng,
            targetLng: input.targetLng,
            strategy: input.strategy,
            publishOnTranslation: input.publishOnTranslation,
          },
          scope
        );

        task.status = "completed";
        task.completedAt = new Date().toISOString();
      } catch (error) {
        task.status = "failed";
        task.error = {
          message: error instanceof Error ? error.message : "Unknown error",
        };
        // Abandon the remaining locales: with the caller's transaction already rolled back they
        // would only pile up errors against a dead one.
        if (killedTheCallersTransaction(scope, error)) throw error;
      } finally {
        // `finally`, not after the `try`: the rethrow above must still leave a timestamp, or
        // `LazyMap` never evicts the failed task.
        task.updatedAt = new Date().toISOString();
      }
    }
  }

  async cancel(_taskIds: string[]): Promise<void> {
    // No-op: synchronous tasks execute immediately and cannot be cancelled
  }

  async run(_taskId: string): Promise<RunResult> {
    // Sync runner executes tasks immediately, no pending tasks to run
    return { success: false, error: "not_found" };
  }

  async findByCollection(
    collectionSlug: CollectionSlug,
    filter?: Array<string | number> | TaskFilter
  ): Promise<Task[]> {
    const { documentIds, excludeCompleted } = toTaskFilter(filter);
    const results: Task[] = [];
    const wanted = documentIds ? new Set(documentIds.map(String)) : undefined;

    for (const [, task] of this.tasks) {
      if (task.input.collectionSlug !== collectionSlug) continue;
      if (wanted && !wanted.has(task.input.collectionId)) continue;
      // Keyed on `completedAt`, the same field the jobs runner pushes into its where clause. Keying
      // on `status` instead would agree only by accident: `getJobStatus` happens to check
      // `completedAt` before `error`, and reordering it would silently split the two runners.
      if (excludeCompleted && task.completedAt) continue;
      results.push(task);
    }

    return results;
  }

  // Keyed by (document, target locale) so translating a second locale of the same document does not
  // evict the first — findByCollection must be able to return one task per locale.
  private getKey(collectionSlug: CollectionSlug, collectionId: ID, targetLng: string): string {
    return `${collectionSlug}:${collectionId}:${targetLng}`;
  }
}
