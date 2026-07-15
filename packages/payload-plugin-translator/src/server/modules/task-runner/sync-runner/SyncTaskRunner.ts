import type { Payload, CollectionSlug } from "payload";

import type { TaskRunner } from "../TaskRunner.interface";
import type { TaskHandler } from "../TaskRunnerProvider.interface";
import type { Task, TaskInput, RunResult, ID } from "../types";
import type { LazyMap } from "../../../shared/utils";

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

  async enqueue(inputs: TaskInput[]): Promise<void> {
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
        await this.handler(this.payload, {
          collection: input.collectionSlug,
          collectionId: input.collectionId,
          sourceLng: input.sourceLng,
          targetLng: input.targetLng,
          strategy: input.strategy,
          publishOnTranslation: input.publishOnTranslation,
        });

        task.status = "completed";
        task.completedAt = new Date().toISOString();
      } catch (error) {
        task.status = "failed";
        task.error = {
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }

      task.updatedAt = new Date().toISOString();
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
    documentIds?: Array<string | number>
  ): Promise<Task[]> {
    const results: Task[] = [];
    const wanted = documentIds ? new Set(documentIds.map(String)) : undefined;

    for (const [, task] of this.tasks) {
      if (task.input.collectionSlug !== collectionSlug) continue;
      if (wanted && !wanted.has(task.input.collectionId)) continue;
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
