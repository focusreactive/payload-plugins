import type { CollectionSlug } from "payload";

import type { EnqueueAssignment, Task, TaskInput, RunResult } from "./types.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";

/**
 * Interface for task execution backends.
 *
 * Implementations handle queuing, cancellation, status tracking,
 * and execution of translation tasks. All business logic
 * (like cancelling existing tasks before enqueue) is encapsulated
 * within the implementation.
 *
 * **Obligations every implementation holds, whatever it queues onto.** `__tests__/TaskRunner.invariants.ts`
 * asserts them; a new runner calls that suite once, and the suite's `describe` names are the list.
 *
 * Two it cannot assert, because they bind the caller rather than the runner:
 * - **A handle is never parsed.** Callers compare it, store it and hand it back.
 * - **Nothing promises an order.** Callers that need one sort.
 *
 * And one limit: the obligations reach handles **this runner issued**. A store may reject a value
 * it could never have produced — on SQL the job id is an integer, so a non-numeric handle fails
 * inside the query rather than finding nothing. `DELETE /translate/cancel` passes such a value
 * straight through, and answers with a server error.
 */
export interface TaskRunner {
  /**
   * Queue translation tasks for execution.
   *
   * `scope` joins the reads and writes this makes to the caller's transaction; omit it outside one —
   * an HTTP route — and each operation opens its own.
   *
   * Answering with nothing still queues and still satisfies this contract — deprecated,
   * docs/DEPRECATIONS.md#enqueue-void-return.
   *
   * @since 0.16.0 the return type widened.
   */
  enqueue(tasks: TaskInput[], scope?: RequestScope): Promise<EnqueueAssignment[] | void>;

  /**
   * Stop the work these handles stand for, as far as this runner can.
   *
   * Best effort: a runner that translates inline inside `enqueue` has nothing left to stop.
   * "Cancelled" is not "did not happen" — only {@link TaskRunner.findByIds} says what was still owed.
   */
  cancel(taskIds: string[]): Promise<void>;

  /**
   * One {@link Task} per handle **and target locale**, not one per handle.
   *
   * Optional: a runner that omits it works unchanged, and `onCancelled` never fires for it.
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
