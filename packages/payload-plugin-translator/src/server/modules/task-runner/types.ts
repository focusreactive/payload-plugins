import type { CollectionSlug } from "payload";

/**
 * Document identifier.
 *
 * The plugin is ID-agnostic: it treats every document ID as a string
 * internally, converting once at ingress (the enqueue boundary / write side).
 * Payload coerces the string back to the collection's native PK type on
 * `findByID` / `update`, so number-id (autoincrement) and string-id (uuid/text)
 * collections both work without the plugin ever branching on ID type.
 */
export type ID = string;

/**
 * Status of a translation task
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed";

/**
 * Input for creating a new translation task
 */
export type TaskInput = {
  collectionSlug: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  strategy: "overwrite" | "skip_existing";
  publishOnTranslation: boolean;
  /**
   * Optional scheduled-run time (debounce). When set, the job runs no earlier than this instant;
   * omitted/`undefined` = run as soon as the runner picks it up (every existing caller). Honored by
   * the Payload Jobs runner via `payload.jobs.queue({ waitUntil })`; the sync (dev) runner ignores it
   * and runs immediately.
   */
  waitUntil?: Date;
};

/**
 * Normalized task representation
 */
export type Task = {
  /** The run's handle. One run covers a document's whole locale list, so every task of that run
   * carries the same id. */
  id: string;
  status: TaskStatus;
  input: TaskInput;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: { message: string };
  cancelled: boolean;
};

/**
 * One entry per requested target locale — including a locale an existing run already covers, which
 * is being translated and so is owed that run's handle.
 *
 * `handle` is the runner's own name for the work: hand it back to `TaskRunner.cancel` unchanged,
 * never parse it.
 *
 * @since 0.16.0
 */
export type EnqueueAssignment = {
  collectionSlug: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  strategy: string;
  handle: string;
};

/**
 * What became of one {@link EnqueueAssignment}.
 *
 * One terminal event per assignment, except a locale already being translated when its run is
 * cancelled: cancelling does not stop work in flight, so it may be reported `cancelled` and still
 * settle `delivered`.
 *
 * For a locale a run never reached, `failed`'s `error` is the failure that ended the run, not its
 * own — nothing ran for it to throw.
 */
export type TaskEvent =
  | { state: "queued" }
  | { state: "delivered" }
  | { state: "failed"; error: unknown }
  | { state: "cancelled" };

/**
 * Result of run operation
 */
export type RunResult =
  | { success: true }
  | {
      success: false;
      error: "not_found" | "already_running" | "already_completed";
    };
