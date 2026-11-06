import { z } from "zod";
import type { CollectionSlug } from "payload";

import { JobIdSchema } from "../../shared/index.js";
import type { LeafAddress } from "../../../core/domain/content-projection/idPath.js";
import type { LocaleStaleness, ProvenanceServiceFactory } from "../../modules/provenance/index.js";

/**
 * Route params for reading a document's per-locale staleness.
 *
 * `collection_id` accepts any shape Payload allows as a document id — see {@link JobIdSchema}.
 */
export const GetDocumentStalenessInputSchema = z.object({
  collection_id: JobIdSchema,
  collection_slug: z.string().nonempty(),
});

export const DismissStalenessInputSchema = z.object({
  collection_id: JobIdSchema,
  collection_slug: z.string().nonempty(),
  target_lng: z.string().nonempty(),
});

/** One locale's staleness on the wire. `changed_leaves` is absent, not empty, when nothing is known about which leaves moved. */
export type StalenessLocaleBody = {
  target_lng: string;
  source_lng: string;
  is_stale: boolean;
  translated_at: string;
  changed_leaves?: LeafAddress[];
};

export const asStalenessBody = (locale: LocaleStaleness): StalenessLocaleBody => ({
  target_lng: locale.targetLocale,
  source_lng: locale.sourceLocale,
  is_stale: locale.isStale,
  translated_at: locale.translatedAt,
  ...(locale.changedLeaves === undefined ? {} : { changed_leaves: locale.changedLeaves }),
});

export type StalenessConfig = {
  provenanceServiceFactory: ProvenanceServiceFactory;
  availableCollections: Set<CollectionSlug>;
};
