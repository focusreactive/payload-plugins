import type { z } from "zod";

import type { StoredInputSchema, WorkflowInputSchema } from "./jobInput.schema.js";

/** Payload keys a run's per-task state by the task's slug, and each task by the id it ran under —
 * which for this plugin's runs is the target locale. */
type TaskSlug = string;
type TaskId = string;

export type PayloadJob = {
  /** Payload sets this once a run's retries are spent, and never clears it. */
  hasError?: boolean;
  log?: JobLogEntry[];
  /** How many times the whole run has been executed — Payload's second give-up counter. */
  totalTried?: unknown;
  taskStatus?: Record<TaskSlug, Record<TaskId, { totalTried?: unknown }>>;
  id: string | number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  error?: unknown;
  processing?: boolean | null;
  waitUntil?: string | null;
  input?: z.infer<typeof StoredInputSchema>;
};

/**
 * Everything a reader needs to say which document a row is for.
 *
 * Named apart from the row so the one boundary allowed to read the deprecated `collection` can
 * demand exactly what it reads and nothing else.
 */
export type StoredCollectionFields = Pick<
  z.infer<typeof StoredInputSchema>,
  "collection_slug" | "collection_id" | "collection"
>;

/**
 * What one locale's task is handed: a row read back, narrowed to the locale this attempt
 * translates. `target_lngs` belongs to the run; `target_lng` belongs to the attempt.
 */
export type StoredTaskInput = z.infer<typeof StoredInputSchema> &
  Required<Pick<z.infer<typeof StoredInputSchema>, "source_lng" | "target_lng">>;

/** What this plugin writes when it queues a run. */
export type StoredWorkflowInput = z.infer<typeof WorkflowInputSchema>;

/** Written by Payload only once a task settles — an absent entry means that locale has not run. */
export type JobLogEntry = {
  state: "succeeded" | "failed";
  completedAt?: string | null;
  input?: { target_lng?: string };
};
