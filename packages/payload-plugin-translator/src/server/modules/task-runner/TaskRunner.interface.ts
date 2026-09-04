import type { CollectionSlug } from "payload";

import type { Task, TaskInput, RunResult } from "./types";

/**
 * Interface for task execution backends.
 *
 * Implementations handle queuing, cancellation, status tracking,
 * and execution of translation tasks. All business logic
 * (like cancelling existing tasks before enqueue) is encapsulated
 * within the implementation.
 */
export interface TaskRunner {
  /**
   * Queue translation tasks for execution.
   * Implementation handles cancellation of existing tasks for the same documents.
   */
  enqueue(tasks: TaskInput[]): Promise<void>;

  /**
   * Cancel tasks by IDs.
   */
  cancel(taskIds: string[]): Promise<void>;

  /**
   * Execute a task immediately.
   * Returns error status if task not found, already running, or completed.
   */
  run(taskId: string): Promise<RunResult>;

  /**
   * @deprecated Pass `{ documentIds }` instead. Removed in the next major.
   * See docs/DEPRECATIONS.md#find-by-collection-document-ids-array
   */
  findByCollection(
    collectionSlug: CollectionSlug,
    documentIds: Array<string | number>
  ): Promise<Task[]>;
  /** Find tasks for a collection, optionally narrowed by a {@link TaskFilter}. */
  findByCollection(collectionSlug: CollectionSlug, filter?: TaskFilter): Promise<Task[]>;
}

/**
 * How a {@link TaskRunner.findByCollection} call is narrowed. Each field says whether it reaches the
 * database or is applied in memory over everything the database returned.
 *
 * @since 0.12.0
 */
export type TaskFilter = {
  /** Keep only tasks for these documents. Applied in memory — see `PayloadJobsTaskRunner.findByCollection`. */
  documentIds?: Array<string | number>;
  /**
   * Drop tasks that have finished. Keeps running and failed ones — everything a re-enqueue can still
   * supersede — so it is wider than the `pending` status.
   */
  excludeCompleted?: boolean;
};
