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
 * One run of one locale — in flight, or failed inside the window the panel counts. Two entries can
 * share a document and a locale: a failure and the run queued after it are both reported.
 */
export type CollectionStatusItem = {
  status: TaskStatus;
  collection_id: string;
  target_lng: string;
};

/**
 * Handler output
 */
export type GetCollectionStatusOutput = {
  docs: CollectionStatusItem[];
  /** The failures in `docs` reach back only this far, in ms. */
  failed_window_ms: number;
};

/**
 * Handler configuration
 */
export type GetCollectionStatusConfig = {
  availableCollections: Set<CollectionSlug>;
  failedWindowMs: number;
};
