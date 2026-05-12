import { z } from 'zod'
import type { CollectionSlug } from 'payload'

/**
 * Input validation schema
 */
export const EnqueueInputSchema = z.object({
  source_lng: z.string().nonempty(),
  target_lng: z.string().nonempty(),
  collection_slug: z.string().nonempty(),
  collection_id: z.array(z.coerce.string()).nonempty(),
  select_all: z.boolean().optional(),
  strategy: z.enum(['overwrite', 'skip_existing']).optional().default('overwrite'),
  publish_on_translation: z.boolean().optional().default(false),
})

/**
 * Handler configuration
 */
export type EnqueueConfig = {
  availableCollections: Set<CollectionSlug>
}
