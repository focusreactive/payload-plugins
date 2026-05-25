import type { CollectionSlug } from "payload";
import { z } from "zod";

/**
 * Input validation schema
 */
export const CancelByCollectionInputSchema = z.object({
  collection_slug: z.string().nonempty(),
});

/**
 * Handler configuration
 */
export interface CancelConfig {
  availableCollections: Set<CollectionSlug>;
}
