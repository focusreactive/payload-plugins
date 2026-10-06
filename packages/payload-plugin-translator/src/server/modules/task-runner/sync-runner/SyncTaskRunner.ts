import type { Payload, CollectionSlug } from "payload";

import type { EnqueueResult, TaskFilter, TaskRunner } from "../TaskRunner.interface.js";
import { toTaskFilter } from "../toTaskFilter.js";
import type { TaskHandler } from "../TaskRunnerProvider.interface.js";
import type { Task, TaskInput, RunResult, ID } from "../types.js";
import type { LazyMap } from "../../../shared/utils/index.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { swallowOrThrow } from "../../../shared/payload/swallowOrThrow.js";

/** Runs each task inline on enqueue; results live only in memory, so status queries see nothing from a previous process. */
export class SyncTaskRunner implements TaskRunner {
  private readonly payload: Payload;
  private readonly handler: TaskHandler;
  private readonly tasks: LazyMap<string, Task>;

  constructor(payload: Payload, handler: TaskHandler, tasks: LazyMap<string, Task>) {
    this.payload = payload;
    this.handler = handler;
    this.tasks = tasks;
  }

  async enqueue(inputs: TaskInput[], scope: RequestScope = {}): Promise<EnqueueResult> {
    const queued: EnqueueResult = [];

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
      queued.push({
        collectionSlug: input.collectionSlug,
        collectionId: input.collectionId,
        targetLng: input.targetLng,
        jobId: task.id,
      });

      const markEvictable = (status: "completed" | "failed", error?: Task["error"]) => {
        const at = new Date().toISOString();
        task.status = status;
        task.updatedAt = at;
        if (status === "completed") task.completedAt = at;
        if (error) task.error = error;
      };

      await swallowOrThrow(
        scope,
        async () => {
          await this.handler(
            this.payload,
            {
              collection: input.collectionSlug,
              collectionId: input.collectionId,
              sourceLng: input.sourceLng,
              targetLng: input.targetLng,
              strategy: input.strategy,
              publishOnTranslation: input.publishOnTranslation,
              jobId: task.id,
            },
            scope
          );
          markEvictable("completed");
        },
        (error) =>
          markEvictable("failed", {
            message: error instanceof Error ? error.message : "Unknown error",
          })
      );
    }

    return queued;
  }

  /** No-op: a synchronous task has already run by the time anyone could cancel it. */
  async cancel(_taskIds: string[]): Promise<void> {
    return undefined;
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
