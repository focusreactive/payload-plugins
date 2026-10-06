import { z } from "zod";
import type { CollectionSlug } from "payload";

import type { Task, TaskStatus } from "../../modules/task-runner/index.js";

/**
 * Input validation schema
 */
export const GetCollectionStatusInputSchema = z.object({
  collection_slug: z.string().nonempty(),
});

export type GetCollectionStatusInput = z.infer<typeof GetCollectionStatusInputSchema>;

/**
 * One translation in flight: a job, and which document and locale it is for.
 *
 * `id` is the job, and a job covers a document's whole locale list — so it repeats across entries and
 * cannot identify a row on its own.
 */
export type CollectionStatusItem = {
  id: string;
  status: TaskStatus;
  collection_id: string;
  target_lng: string;
};

export const toCollectionStatusItem = (task: Task): CollectionStatusItem => ({
  id: task.id,
  status: task.status,
  collection_id: String(task.input.collectionId),
  target_lng: task.input.targetLng,
});

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
