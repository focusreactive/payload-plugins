import { z } from "zod";
import type { CollectionSlug } from "payload";

import { JobIdSchema } from "../../shared";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { ProvenanceStoreFactory } from "../../modules/provenance";

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

/**
 * Per-locale staleness for one document (snake_case for client compatibility, matching the other
 * translation endpoints). One entry per target locale that has a provenance record.
 */
export type StalenessLocaleOutput = {
  target_lng: string;
  source_lng: string;
  is_stale: boolean;
  translated_at: string;
};

/**
 * Handler configuration. `provenanceStoreFactory` is absent when provenance is disabled — the
 * handlers then report no staleness (empty), so the endpoint contract stays stable either way.
 */
export type StalenessConfig = {
  availableCollections: Set<CollectionSlug>;
  schemaMap: CollectionSchemaMap;
  provenanceStoreFactory?: ProvenanceStoreFactory;
};
