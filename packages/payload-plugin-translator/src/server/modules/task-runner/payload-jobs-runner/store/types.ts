import type { z } from "zod";

import type { TaskInputSchema, WorkflowInputSchema } from "./jobInput.schema.js";

type TaskSlug = string;
/** Payload keys each task of a run by the id it ran under, which for this plugin is the locale. */
export type LocaleCode = string;

export type StoredWorkflowInput = z.infer<typeof WorkflowInputSchema>;
export type StoredTaskInput = z.infer<typeof TaskInputSchema>;

export type TaskStatusByLocale = Record<TaskSlug, Record<LocaleCode, { totalTried?: unknown }>>;

export type JobLogEntry = {
  taskSlug?: string;
  taskID?: string;
  state?: string;
  input?: Record<string, unknown>;
  error?: unknown;
  executedAt?: string;
  completedAt?: string;
};

/**
 * A `payload-jobs` row as this plugin reads it. `input` is left open because a row queued before 1.0
 * carries the whole run where a new one carries a pointer; only `legacy/` looks at the difference.
 */
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
  input?: Record<string, unknown>;
};
