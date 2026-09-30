import type { CollectionSlug, Payload } from "payload";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";

const CURRENT_VERSION_OF_THIS_LOCALE_ONLY = { draft: true, fallbackLocale: false } as const;

/**
 * The single source read: what "translate from X" resolves to. Both translation write paths and
 * the staleness recompute must go through here, or the fingerprints they compare drift apart.
 */
export function fetchSourceDocument(
  payload: Payload,
  collection: CollectionSlug,
  id: string,
  locale: string,
  scope: RequestScope = {}
) {
  return payload.findByID({
    req: freshReq(scope),
    collection,
    id,
    locale,
    depth: 0,
    ...CURRENT_VERSION_OF_THIS_LOCALE_ONLY,
  });
}
