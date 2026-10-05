import type { GlobalAfterReadHook } from "payload";
import type { ValueExcludePredicate } from "../excludeValues.js";
import type { SchemaCache } from "./schemaCache.js";
import type { Enrichment } from "./gate.js";

import { encodeStega } from "./encodeStega.js";
import { enrichWithPathMeta } from "./enrichWithPathMeta.js";
import { shouldEnrich } from "./gate.js";

type Args = {
  schemaCache: SchemaCache;
  excludeValues: readonly ValueExcludePredicate[];
  adminBasePath: string;
  enrichment?: Enrichment;
};

// Globals: no afterOperation hook exists, so enrichment + encoding happen here.
// Populated collection sub-docs (if any) already carry their own `_meta` from their own afterRead;
// `enrichWithPathMeta` preserves those.
export const createGlobalAfterReadHook = ({
  schemaCache,
  excludeValues,
  adminBasePath,
  enrichment,
}: Args): GlobalAfterReadHook => {
  return ({ doc, global, req }) => {
    if (!shouldEnrich(req, adminBasePath, enrichment)) return doc;
    if (!doc || typeof doc !== "object") return doc;

    const enriched = enrichWithPathMeta(doc, {
      collectionSlug: global.slug,
      kind: "global",
    });
    return encodeStega(enriched, (slug) => schemaCache.get(slug, req.payload), excludeValues);
  };
};
