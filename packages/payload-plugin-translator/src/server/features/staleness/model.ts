import { z } from "zod";
import type { CollectionSlug } from "payload";

import { JobIdSchema } from "../../shared";
import type { TranslationContext } from "../../modules/translation-levels";

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
 * Handler configuration. `provenanceServiceFactory` is absent when provenance is disabled — the
 * handlers then report no staleness (empty), so the endpoint contract stays stable either way.
 * The fingerprint policy + schema live inside {@link ProvenanceService}, so no `schemaMap` here.
 */
export type StalenessConfig = Pick<TranslationContext, "provenanceServiceFactory"> & {
  availableCollections: Set<CollectionSlug>;
};
