import { z } from "zod";
import type { CollectionSlug } from "payload";

import { JobIdSchema, toClientErrorMessage } from "../../shared";
import type { Task, TaskStatus } from "../../modules/task-runner";

/**
 * Input validation schema.
 *
 * `collection_id` accepts any of the shapes Payload allows as a document ID
 * (integer autoincrement, UUID, MongoDB ObjectId, etc.). See JobIdSchema for
 * the rationale.
 */
export const GetDocumentStatusInputSchema = z.object({
  collection_id: JobIdSchema,
  collection_slug: z.string().nonempty(),
});

export type GetDocumentStatusInput = z.infer<typeof GetDocumentStatusInputSchema>;

/**
 * Translation task status (re-export for backwards compatibility)
 */
export type TranslationTaskStatus = TaskStatus;

/**
 * Input format for API response (backwards compatible with Payload Jobs format)
 */
export type JobInputOutput = {
  collection: {
    relationTo: CollectionSlug;
    value: string;
  };
  source_lng: string;
  target_lng: string;
  strategy?: string;
};

/**
 * Normalized job output (snake_case for client compatibility)
 */
export type JobStatusOutput = {
  id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  input: JobInputOutput;
  error?: { message: string };
  cancelled: boolean;
};

/**
 * Handler configuration
 */
export type GetDocumentStatusConfig = {
  availableCollections: Set<CollectionSlug>;
};

// A job is "newer" by creation time, tie-broken by last update — both ISO-8601, so a lexicographic
// string compare is a correct chronological compare (no Date parsing needed).
const isNewerTask = (candidate: Task, current: Task): boolean =>
  candidate.createdAt !== current.createdAt
    ? candidate.createdAt > current.createdAt
    : candidate.updatedAt > current.updatedAt;

/**
 * Reduce a document's jobs to the latest one per target locale.
 *
 * `findByCollection` returns every job for the document across all target locales (plus any superseded
 * jobs not yet cancelled). The status panel shows one row per target locale, so we keep — per
 * `targetLng` — the most recently created job (tie-break: most recently updated). Without this the
 * caller sees a single arbitrary job and every other in-flight locale looks idle, which is the
 * concurrent re-translate bug (a second re-translate appearing to overwrite the first's status).
 */
export function latestTaskPerTargetLocale(tasks: Task[]): Task[] {
  const byLocale = new Map<string, Task>();
  for (const task of tasks) {
    const current = byLocale.get(task.input.targetLng);
    if (!current || isNewerTask(task, current)) byLocale.set(task.input.targetLng, task);
  }
  return [...byLocale.values()];
}

/**
 * Transforms a Task to API output format (snake_case for client compatibility)
 */
export function taskToJobStatusOutput(task: Task): JobStatusOutput {
  return {
    id: task.id,
    status: task.status,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
    input: {
      collection: {
        relationTo: task.input.collectionSlug,
        value: task.input.collectionId,
      },
      source_lng: task.input.sourceLng,
      target_lng: task.input.targetLng,
      strategy: task.input.strategy,
    },
    // Never ship the raw provider/runtime error to the browser outside development — it can leak
    // implementation detail and secrets (e.g. a partial API key). The full error stays in the job
    // record + server logs.
    error: task.error ? { message: toClientErrorMessage(task.error.message) } : undefined,
    cancelled: task.cancelled,
  };
}
