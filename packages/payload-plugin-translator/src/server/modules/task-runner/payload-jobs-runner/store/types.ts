import type { z } from "zod";

import type { RunTargetSchema, StoredInputSchema, WorkflowInputSchema } from "./jobInput.schema.js";

type TaskSlug = string;
/** Payload keys each task of a run by the id it ran under, which for this plugin is the locale. */
export type LocaleCode = string;

export type StoredInput = z.infer<typeof StoredInputSchema>;

export type StoredRunTarget = z.infer<typeof RunTargetSchema>;

export type TaskStatusByLocale = Record<TaskSlug, Record<LocaleCode, { totalTried?: unknown }>>;

export type PayloadJob = {
  /** Payload sets this once a run's retries are spent, and never clears it. */
  hasError?: boolean;
  log?: JobLogEntry[];
  totalTried?: unknown;
  taskStatus?: TaskStatusByLocale;
  id: string | number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  error?: unknown;
  processing?: boolean | null;
  waitUntil?: string | null;
  input?: StoredInput;
};

export type StoredCollectionFields = Pick<
  z.infer<typeof StoredInputSchema>,
  "collection_slug" | "collection_id" | "collection"
>;

/**
 * A row read back, narrowed to the one locale this attempt translates: `targets` is the run's list,
 * `target_lng` the entry this task was handed.
 */
export type StoredTaskInput = z.infer<typeof StoredInputSchema> &
  Required<Pick<z.infer<typeof StoredInputSchema>, "source_lng" | "target_lng">>;

export type StoredWorkflowInput = z.infer<typeof WorkflowInputSchema>;

/** Written by Payload only once a task settles — an absent entry means that locale has not run. */
export type JobLogEntry = {
  state: "succeeded" | "failed";
  completedAt?: string | null;
  input?: { target_lng?: string };
};
