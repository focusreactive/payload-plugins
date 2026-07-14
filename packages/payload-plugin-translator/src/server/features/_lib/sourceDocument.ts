import type { CollectionSlug, Payload } from "payload";

/**
 * Fetch a document's source-locale data with the exact shape the provenance fingerprint depends on
 * (`depth: 0`, the given locale). Shared by the translation **write** path (which fingerprints the
 * source it just translated) and the staleness **read** path (which re-fingerprints the live source),
 * so the fingerprint baseline can never drift between the two — the single biggest correctness trap in
 * staleness detection is thus enforced structurally, not by a comment.
 */
export function fetchSourceDocument(
  payload: Payload,
  collection: CollectionSlug,
  id: string,
  locale: string
) {
  return payload.findByID({ collection, id, locale, depth: 0 });
}
