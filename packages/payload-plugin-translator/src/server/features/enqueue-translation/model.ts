import type { CollectionSlug } from "payload";
import { z } from "zod";

/**
 * Input validation schema
 */
export const EnqueueInputSchema = z.object({
  collection_id: z.array(z.coerce.string()).nonempty(),
  collection_slug: z.string().nonempty(),
  publish_on_translation: z.boolean().optional().default(false),
  select_all: z.boolean().optional(),
  source_lng: z.string().nonempty(),
  strategy: z
    .enum(["overwrite", "skip_existing"])
    .optional()
    .default("overwrite"),
  target_lng: z.string().nonempty(),
});

/**
 * Handler configuration
 */
export interface EnqueueConfig {
  availableCollections: Set<CollectionSlug>;
}
