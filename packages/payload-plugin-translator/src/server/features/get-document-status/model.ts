import type { CollectionSlug } from "payload";
import { z } from "zod";

import type { Task, TaskStatus } from "../../modules/task-runner";
import { JobIdSchema } from "../../shared";

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

export type GetDocumentStatusInput = z.infer<
  typeof GetDocumentStatusInputSchema
>;

/**
 * Translation task status (re-export for backwards compatibility)
 */
export type TranslationTaskStatus = TaskStatus;

/**
 * Input format for API response (backwards compatible with Payload Jobs format)
 */
export interface JobInputOutput {
  collection: {
    relationTo: CollectionSlug;
    value: string | number;
  };
  source_lng: string;
  target_lng: string;
  strategy?: string;
}

/**
 * Normalized job output (snake_case for client compatibility)
 */
export interface JobStatusOutput {
  id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  input: JobInputOutput;
  error?: { message: string };
  cancelled: boolean;
}

/**
 * Handler configuration
 */
export interface GetDocumentStatusConfig {
  availableCollections: Set<CollectionSlug>;
}

/**
 * Transforms a Task to API output format (snake_case for client compatibility)
 */
export function taskToJobStatusOutput(task: Task): JobStatusOutput {
  return {
    cancelled: task.cancelled,
    completed_at: task.completedAt,
    created_at: task.createdAt,
    error: task.error,
    id: task.id,
    input: {
      collection: {
        relationTo: task.input.collectionSlug,
        value: task.input.collectionId,
      },
      source_lng: task.input.sourceLng,
      strategy: task.input.strategy,
      target_lng: task.input.targetLng,
    },
    status: task.status,
    updated_at: task.updatedAt,
  };
}
