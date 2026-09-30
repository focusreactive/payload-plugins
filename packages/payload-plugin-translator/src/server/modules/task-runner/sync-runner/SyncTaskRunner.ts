import type { Payload, CollectionSlug } from "payload";

import type { TaskFilter, TaskRunner } from "../TaskRunner.interface.js";
import { toTaskFilter } from "../toTaskFilter.js";
import type { TaskHandler } from "../TaskRunnerProvider.interface.js";
import type { Task, TaskInput, RunResult, ID } from "../types.js";
import type { LazyMap } from "../../../shared/utils/index.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { killedTheCallersTransaction } from "../../../shared/payload/killedTheCallersTransaction.js";

/**
 * Synchronous TaskRunner implementation.
 *
 * Executes translations immediately without queuing.
 * Stores results in memory for status queries.
 */
export class SyncTaskRunner implements TaskRunner {
  private readonly payload: Payload;
  private readonly handler: TaskHandler;
  private readonly tasks: LazyMap<string, Task>;

  constructor(payload: Payload, handler: TaskHandler, tasks: LazyMap<string, Task>) {
    this.payload = payload;
    this.handler = handler;
    this.tasks = tasks;
  }

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

      const markEvictable = (status: "completed" | "failed", error?: Task["error"]) => {
        const at = new Date().toISOString();
        task.status = status;
        task.updatedAt = at;
        if (status === "completed") task.completedAt = at;
        if (error) task.error = error;
      };

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

        markEvictable("completed");
      } catch (error) {
        markEvictable("failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        if (killedTheCallersTransaction(scope, error)) throw error;
      }
    }
  }

  async cancel(_taskIds: string[]): Promise<void> {
    // No-op: synchronous tasks execute immediately and cannot be cancelled
  }

  async run(_taskId: string): Promise<RunResult> {
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
      if (excludeCompleted && task.completedAt) continue;
      results.push(task);
    }

    return results;
  }

  private getKey(collectionSlug: CollectionSlug, collectionId: ID, targetLng: string): string {
    return `${collectionSlug}:${collectionId}:${targetLng}`;
  }
}
