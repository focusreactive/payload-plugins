import type { CollectionSlug } from "payload";

import type { ID, Task, TaskInput, RunResult } from "./types.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";

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
   *
   * `scope` joins the reads and writes this makes to the caller's transaction; omit it outside one —
   * an HTTP route — and each operation opens its own.
   *
   * Answer with an {@link EnqueueResult}; the `void` form still compiles but is deprecated — see
   * {@link LegacyVoidEnqueue}.
   *
   * @since 0.16.0 the return type widened.
   */
  enqueue(tasks: TaskInput[], scope?: RequestScope): Promise<EnqueueResult | LegacyVoidEnqueue>;

  /**
   * Cancel tasks by IDs.
   */
  cancel(taskIds: string[]): Promise<void>;

  /**
   * Resolve job ids to the tasks they stand for — the cancel route holds nothing else. Optional: a
   * runner that omits it works unchanged, and `onCancelled` never fires for it.
   *
   * @since 0.16.0
   */
  findByIds?(taskIds: string[]): Promise<Task[]>;

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
 * What `enqueue` answered before 0.16.0: nothing. Callers degrade to reporting no ids — the enqueue
 * response omits them and the lifecycle callbacks carry none.
 *
 * @since 0.16.0
 * @deprecated Return an {@link EnqueueResult}. Removed in the next major.
 * See docs/DEPRECATIONS.md#enqueue-void-return
 */
export type LegacyVoidEnqueue = void;

/**
 * What an enqueue created, one entry per requested target locale. Two locales of the same document
 * carry the same `jobId` — one job row covers a document's whole locale list.
 *
 * @since 0.16.0
 */
export type EnqueueResult = Array<{
  collectionSlug: CollectionSlug;
  collectionId: ID;
  targetLng: string;
  jobId: string;
}>;

/**
 * How a {@link TaskRunner["findByCollection"]} call is narrowed. Each field says whether it reaches the
 * database or is applied in memory over everything the database returned.
 *
 * @since 0.11.2
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
