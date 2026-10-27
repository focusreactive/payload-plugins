import type { CollectionSlug } from "payload";

import type { TranslationFilter } from "../../../core/domain/selection/index.js";

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
 * The runner's own name for a queued run: compared, stored and handed back unparsed. Not a document
 * id — one handle covers a document's whole locale list.
 */
export type JobHandle = string;

/**
 * Status of a translation task
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed";

/**
 * What a request asked a run to translate, for one target locale: the filters it carries, whose
 * answers the run intersects. **No filters means every translatable leaf of the document.**
 */
export type RunAsk = {
  filters?: readonly TranslationFilter[];
};

/**
 * Input for creating a new translation task
 */
export type TaskInput = RunAsk & {
  collectionSlug: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
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
  id: JobHandle;
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
  handle: JobHandle;
};

/** What a handle stands for: the document the job translates, and who asked for it. */
export type JobAssignment = {
  handle: JobHandle;
  collectionSlug: CollectionSlug;
  collectionId: ID;
  /** `null` when nobody was recorded: a runner that keeps no requester, or work started without one. */
  startedBy: { id: string; collection: string } | null;
};

/**
 * Which locale of which run a report is about.
 *
 * @since 1.0.0
 */
export type RunRef = {
  handle: JobHandle;
  targetLng: string;
};

/**
 * What one queued locale was asked to do.
 *
 * @since 1.0.0
 */
export type QueuedWork = RunAsk & {
  collectionSlug: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  publishOnTranslation: boolean;
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
  | { state: "queued"; work: QueuedWork }
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
