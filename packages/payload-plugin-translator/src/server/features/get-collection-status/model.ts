import type { CollectionSlug } from "payload";
import { z } from "zod";

import type { TaskStatus } from "../../modules/task-runner";

/**
 * Input validation schema
 */
export const GetCollectionStatusInputSchema = z.object({
  collection_slug: z.string().nonempty(),
});

export type GetCollectionStatusInput = z.infer<
  typeof GetCollectionStatusInputSchema
>;

/**
 * Summary item for a single document
 */
export interface CollectionStatusItem {
  id: string;
  status: TaskStatus;
}

/**
 * Handler output
 */
export interface GetCollectionStatusOutput {
  docs: CollectionStatusItem[];
}

/**
 * Handler configuration
 */
export interface GetCollectionStatusConfig {
  availableCollections: Set<CollectionSlug>;
}
