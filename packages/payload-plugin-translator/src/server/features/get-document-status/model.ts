import { z } from "zod";
import type { CollectionSlug } from "payload";

import { JobIdSchema } from "../../shared/index.js";
import type { TaskStatus } from "../../modules/task-runner/index.js";
import { lastTouched } from "../../modules/runs/index.js";
import type { ReportedRun } from "../../modules/runs/index.js";

/**
 * Input validation schema.
 *
 * `collection_id` accepts any of the shapes Payload allows as a document ID
 * (integer autoincrement, UUID, MongoDB ObjectId, etc.). See JobIdSchema for
 * the rationale.
 */
export const GetDocumentStatusInputSchema = z.object({
  collection_id: JobIdSchema,
  collection_slug: z.string().nonempty(),
});

export type GetDocumentStatusInput = z.infer<typeof GetDocumentStatusInputSchema>;

/**
 * Translation task status (re-export for backwards compatibility)
 */
export type TranslationTaskStatus = TaskStatus;

/**
 * Input format for API response (backwards compatible with Payload Jobs format)
 */
export type JobInputOutput = {
  collection: {
    relationTo: CollectionSlug;
    value: string;
  };
  source_lng: string;
  target_lng: string;
};

/**
 * Normalized job output (snake_case for client compatibility)
 */
export type JobStatusOutput = {
  id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  input: JobInputOutput;
  error?: { message: string };
  cancelled: boolean;
};

/**
 * Handler configuration
 */
export type GetDocumentStatusConfig = {
  availableCollections: Set<CollectionSlug>;
};

const isNewer = (candidate: ReportedRun, current: ReportedRun): boolean =>
  candidate.row.queuedAt !== current.row.queuedAt
    ? candidate.row.queuedAt > current.row.queuedAt
    : lastTouched(candidate.row) > lastTouched(current.row);

/**
 * One row per locale, out of the row-per-locale-per-run a document accumulates.
 *
 * The input is already filtered to runs the panel has a word for, so a locale whose newest run was
 * cancelled falls back to what it last actually did.
 */
export function latestPerTargetLocale(runs: readonly ReportedRun[]): ReportedRun[] {
  const byLocale = new Map<string, ReportedRun>();
  for (const run of runs) {
    const current = byLocale.get(run.row.targetLng);
    if (!current || isNewer(run, current)) byLocale.set(run.row.targetLng, run);
  }
  return [...byLocale.values()];
}

/**
 * One run of one locale, in the shape the admin has always read.
 *
 * `error` is passed through rather than sanitised: the text is cleaned before it is stored, and a
 * second pass would collapse a named reason's own copy to the generic line.
 */
export function runToJobStatus({ row, status }: ReportedRun): JobStatusOutput {
  return {
    id: row.handle,
    status,
    created_at: row.queuedAt,
    updated_at: lastTouched(row),
    completed_at: row.outcome === "delivered" ? (row.settledAt ?? undefined) : undefined,
    input: {
      collection: { relationTo: row.collectionSlug, value: row.collectionId },
      source_lng: row.sourceLng,
      target_lng: row.targetLng,
    },
    error: row.error === null ? undefined : { message: row.error },
    cancelled: false,
  };
}
