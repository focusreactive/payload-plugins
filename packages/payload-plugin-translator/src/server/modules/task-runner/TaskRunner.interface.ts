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
   * Find tasks by collection and optionally filter by document IDs.
   */
  findByCollection(
    collectionSlug: CollectionSlug,
    documentIds?: (string | number)[]
  ): Promise<Task[]>;
}
