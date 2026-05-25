import { z } from 'zod'
import type { CollectionSlug } from 'payload'

import type { TaskStatus } from '../../modules/task-runner'

/**
 * Input validation schema
 */
export const GetCollectionStatusInputSchema = z.object({
  collection_slug: z.string().nonempty(),
})

export type GetCollectionStatusInput = z.infer<typeof GetCollectionStatusInputSchema>

/**
 * Summary item for a single document
 */
export type CollectionStatusItem = {
  id: string
  status: TaskStatus
}

/**
 * Handler output
 */
export type GetCollectionStatusOutput = {
  docs: CollectionStatusItem[]
}

/**
 * Handler configuration
 */
export type GetCollectionStatusConfig = {
  availableCollections: Set<CollectionSlug>
}
