import { z } from "zod";
import type { CollectionSlug } from "payload";

import type { TaskStatus } from "../../modules/task-runner/index.js";

/**
 * Input validation schema
 */
export const GetCollectionStatusInputSchema = z.object({
  collection_slug: z.string().nonempty(),
});

export type GetCollectionStatusInput = z.infer<typeof GetCollectionStatusInputSchema>;

/**
 * One translation in flight. `id` is the run's handle and a run covers a document's whole locale
 * list, so it repeats — the document and locale are what tell two entries apart.
 */
export type CollectionStatusItem = {
  id: string;
  status: TaskStatus;
  collection_id: string;
  target_lng: string;
};

/**
 * Handler output
 */
export type GetCollectionStatusOutput = {
  docs: CollectionStatusItem[];
};

/**
 * Handler configuration
 */
export type GetCollectionStatusConfig = {
  availableCollections: Set<CollectionSlug>;
};
