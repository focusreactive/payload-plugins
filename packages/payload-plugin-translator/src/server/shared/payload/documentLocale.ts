import type { CollectionSlug, Payload } from "payload";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";
import { enforcedAtTheRead } from "./enforcedAtTheRead.js";
import { latestOf } from "./worldOfCollection.js";

export type DocumentLocaleQuery = {
  payload: Payload;
  collection: CollectionSlug;
  id: string;
  locale: string;
  user?: Record<string, unknown> | null;
  scope?: RequestScope;
};

/**
 * The document's latest version in one locale, with no fallback to another. `null` means the
 * document is not available to this caller, and does not say whether it was refused or absent.
 */
export function fetchDocumentLocale(query: DocumentLocaleQuery) {
  const { payload, collection, id, locale, user, scope } = query;

  return payload.findByID({
    req: freshReq(scope ?? {}),
    collection,
    id,
    locale,
    depth: 0,
    ...enforcedAtTheRead(user),
    ...latestOf(payload, collection),
  });
}
