import type { CollectionAfterReadHook } from "payload";
import type { Enrichment } from "./gate.js";

import { enrichWithPathMeta } from "./enrichWithPathMeta.js";
import { shouldEnrich } from "./gate.js";

export const createAfterReadHook = (
  adminBasePath: string,
  enrichment?: Enrichment
): CollectionAfterReadHook => {
  return ({ doc, collection, req }) => {
    if (!shouldEnrich(req, adminBasePath, enrichment)) return doc;
    if (!doc || typeof doc !== "object") return doc;

    const docId =
      typeof doc.id === "string" || typeof doc.id === "number" ? String(doc.id) : undefined;
    return enrichWithPathMeta(doc, {
      docId,
      collectionSlug: collection.slug,
      kind: "collection",
    });
  };
};
