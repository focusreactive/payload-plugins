import { z } from 'zod'
import type { CollectionSlug } from 'payload'

import type { Task, TaskStatus } from '../../modules/task-runner'

/**
 * Input validation schema
 */
export const GetDocumentStatusInputSchema = z.object({
  collection_id: z.coerce
    .string()
    .refine((val: string) => val.length > 0 && val !== 'undefined', { message: 'Required' }),
  collection_slug: z.string().nonempty(),
})

export type GetDocumentStatusInput = z.infer<typeof GetDocumentStatusInputSchema>

/**
 * Translation task status (re-export for backwards compatibility)
 */
export type TranslationTaskStatus = TaskStatus

/**
 * Input format for API response (backwards compatible with Payload Jobs format)
 */
export type JobInputOutput = {
  collection: {
    relationTo: CollectionSlug
    value: string | number
  }
  source_lng: string
  target_lng: string
  strategy?: string
}

/**
 * Normalized job output (snake_case for client compatibility)
 */
export type JobStatusOutput = {
  id: string
  status: TaskStatus
  created_at: string
  updated_at: string
  completed_at?: string
  input: JobInputOutput
  error?: { message: string }
  cancelled: boolean
}

/**
 * Handler configuration
 */
export type GetDocumentStatusConfig = {
  availableCollections: Set<CollectionSlug>
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
    error: task.error,
    cancelled: task.cancelled,
  }
}
