import { z } from "zod";
import type { CollectionSlug } from "payload";

import type { EnqueueResult } from "../../modules/task-runner/index.js";

/**
 * Input validation schema
 */
export const EnqueueInputSchema = z.object({
  source_lng: z.string().nonempty(),
  // Accept a single locale (back-compat) OR a non-empty list, for multi-target fan-out. The empty
  // array is rejected here so an empty multi-select is a validation error, not a silent no-op.
  target_lng: z.union([z.string().nonempty(), z.array(z.string().nonempty()).min(1)]),
  collection_slug: z.string().nonempty(),
  collection_id: z.array(z.coerce.string()).nonempty(),
  select_all: z.boolean().optional(),
  strategy: z.enum(["overwrite", "skip_existing"]).optional().default("overwrite"),
  publish_on_translation: z.boolean().optional().default(false),
});

/**
 * Handler configuration
 */
export type EnqueueConfig = {
  availableCollections: Set<CollectionSlug>;
};

/**
 * One queued locale, in the snake_case the other translation endpoints answer in.
 *
 * Absent when the runner predates returning ids (docs/DEPRECATIONS.md#enqueue-void-return); empty
 * means the runner answered and could name nothing. `queued` counts what was accepted either way.
 */
export type QueuedJob = {
  collection_slug: string;
  collection_id: string;
  target_lng: string;
  job_id: string;
};

export const toQueuedJobs = (queued: EnqueueResult): QueuedJob[] =>
  queued.map((entry) => ({
    collection_slug: entry.collectionSlug,
    collection_id: entry.collectionId,
    target_lng: entry.targetLng,
    job_id: entry.jobId,
  }));
