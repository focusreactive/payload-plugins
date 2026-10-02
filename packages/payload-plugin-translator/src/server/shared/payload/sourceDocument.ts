import type { CollectionSlug, Payload } from "payload";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";
import { enforcedAtTheRead } from "./enforcedAtTheRead.js";

const CURRENT_VERSION_OF_THIS_LOCALE_ONLY = { draft: true, fallbackLocale: false } as const;

export type SourceDocumentQuery = {
  payload: Payload;
  collection: CollectionSlug;
  id: string;
  locale: string;
  /**
   * Whom the host's `read` rule is asked about. With nobody to name, the read is unchecked — the
   * same rule `enforcedAtTheWrite` has for unattributed writes.
   */
  user?: Record<string, unknown> | null;
  scope?: RequestScope;
};

/**
 * The single source read: what "translate from X" resolves to. Both translation write paths and
 * the staleness recompute must go through here, or the fingerprints they compare drift apart.
 *
 * `null` means the document is not available to this caller, and does not say whether it was
 * refused or absent — the two answers are deliberately identical.
 */
export function fetchSourceDocument(query: SourceDocumentQuery) {
  const { payload, collection, id, locale, user, scope } = query;

  return payload.findByID({
    req: freshReq(scope ?? {}),
    collection,
    id,
    locale,
    depth: 0,
    ...enforcedAtTheRead(user),
    ...CURRENT_VERSION_OF_THIS_LOCALE_ONLY,
  });
}
