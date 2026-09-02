import type { CollectionSlug, Payload } from "payload";

/**
 * The single source read: what "translate from X" resolves to. Both translation write paths and
 * the staleness recompute must go through here, or the fingerprints they compare drift apart.
 */
export function fetchSourceDocument(
  payload: Payload,
  collection: CollectionSlug,
  id: string,
  locale: string
) {
  return payload.findByID({
    collection,
    id,
    locale,
    depth: 0,
    // The current version, as the editor sees it. A published-row read is empty whenever the source
    // locale is unpublished — which is exactly what a publish scoped to the target locale leaves
    // behind — and then every fresh translation fingerprints as stale.
    draft: true,
    // Payload's locale fallback resolves an empty source locale to the default locale's text, so
    // "translate from fr" would translate English and fingerprint English as the French source.
    fallbackLocale: false,
  });
}
