import { z } from "zod";
import type { CollectionSlug } from "payload";

import { JobIdSchema } from "../../shared/index.js";
import type { ProvenanceServiceFactory } from "../../modules/provenance/index.js";

/**
 * Route params for reading a document's per-locale staleness.
 *
 * `collection_id` accepts any shape Payload allows as a document id — see {@link JobIdSchema}.
 */
export const GetDocumentStalenessInputSchema = z.object({
  collection_id: JobIdSchema,
  collection_slug: z.string().nonempty(),
});

/** Body for dismissing (acknowledging) staleness of one target locale. */
export const DismissStalenessInputSchema = z.object({
  collection_id: JobIdSchema,
  collection_slug: z.string().nonempty(),
  target_lng: z.string().nonempty(),
});

export type StalenessConfig = {
  provenanceServiceFactory: ProvenanceServiceFactory;
  availableCollections: Set<CollectionSlug>;
};
