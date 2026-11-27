import { z } from "zod";
import type { CollectionSlug } from "payload";

import { DocumentIdSchema } from "../../shared/index.js";
import type { TaskStatus } from "../../modules/task-runner/index.js";
import { lastTouched } from "../../modules/runs/index.js";
import type { ReportedRun } from "../../modules/runs/index.js";

/**
 * Input validation schema.
 *
 * `collection_id` accepts any shape Payload allows as a document id — see
 * {@link DocumentIdSchema}.
 */
export const GetDocumentStatusInputSchema = z.object({
  collection_id: DocumentIdSchema,
  collection_slug: z.string().nonempty(),
});

export type GetDocumentStatusInput = z.infer<typeof GetDocumentStatusInputSchema>;

/** What one status item is about: the document and the pair of locales. */
export type DocumentStatusItemInput = {
  collection: {
    relationTo: CollectionSlug;
    value: string;
  };
  source_lng: string;
  target_lng: string;
};

/** One target locale of one run, snake_case because the admin reads it off the wire. */
export type DocumentStatusItem = {
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  input: DocumentStatusItemInput;
  error?: { message: string };
  cancelled: boolean;
};

/**
 * Handler configuration
 */
export type GetDocumentStatusConfig = {
  availableCollections: Set<CollectionSlug>;
};

/**
 * `error` is passed through rather than sanitised: the text is cleaned before it is stored, and a
 * second pass would collapse a named reason's own copy to the generic line.
 */
export function runToStatusItem({ row, status }: ReportedRun): DocumentStatusItem {
  return {
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
