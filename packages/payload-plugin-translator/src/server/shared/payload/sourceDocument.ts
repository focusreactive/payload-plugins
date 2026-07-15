import type { CollectionSlug, Payload } from "payload";

/**
 * Fetch a document's source-locale data with the exact shape the provenance fingerprint depends on
 * (`depth: 0`, the given locale). Used by the translation **write** path (fingerprints the source it
 * just translated) and, through {@link ProvenanceService}, by the staleness **read** path
 * (re-fingerprints the live source), so the fingerprint baseline can never drift between the two.
 */
export function fetchSourceDocument(
  payload: Payload,
  collection: CollectionSlug,
  id: string,
  locale: string
) {
  return payload.findByID({ collection, id, locale, depth: 0 });
}
