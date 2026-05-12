import { z } from 'zod'
import type { CollectionSlug } from 'payload'

/**
 * Input validation schema
 */
export const CancelByCollectionInputSchema = z.object({
  collection_slug: z.string().nonempty(),
})

/**
 * Handler configuration
 */
export type CancelConfig = {
  availableCollections: Set<CollectionSlug>
}
