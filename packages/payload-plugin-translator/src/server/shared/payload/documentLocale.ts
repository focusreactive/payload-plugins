import type { CollectionSlug, Payload } from "payload";

import type { RequestScope } from "./RequestScope.shapes.js";
import { freshReq } from "./RequestScope.shapes.js";
import { enforcedAtTheRead } from "./enforcedAtTheRead.js";
import type { VersionRead } from "./worldOfCollection.js";

export type DocumentLocaleQuery = {
  payload: Payload;
  collection: CollectionSlug;
  id: string;
  locale: string;
  read: VersionRead;
  user?: Record<string, unknown> | null;
  scope?: RequestScope;
};

/**
 * `null` means the document is not available to this caller, and does not say whether it was
 * refused or absent — the two answers are deliberately identical.
 */
export function fetchDocumentLocale(query: DocumentLocaleQuery) {
  const { payload, collection, id, locale, read, user, scope } = query;

  return payload.findByID({
    req: freshReq(scope ?? {}),
    collection,
    id,
    locale,
    depth: 0,
    ...enforcedAtTheRead(user),
    ...read,
  });
}
