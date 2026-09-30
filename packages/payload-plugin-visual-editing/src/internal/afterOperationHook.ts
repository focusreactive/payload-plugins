import type { CollectionAfterOperationHook, CollectionSlug } from "payload";
import type { ValueExcludePredicate } from "../excludeValues.js";
import type { SchemaCache } from "./schemaCache.js";

import { encodeStega } from "./encodeStega.js";
import { shouldEnrich } from "./gate.js";

type Args = {
  schemaCache: SchemaCache;
  excludeValues: readonly ValueExcludePredicate[];
  adminBasePath: string;
};

// Payload fires afterOperation exactly once per outermost operation.
// Population uses lower-level reads that trigger afterRead (enrich only)
// but not afterOperation — so we get the fully-populated tree here
// and encode it in a single pass with no risk of double-encoding.
const ENCODING_OPERATIONS = new Set(["find", "findByID", "findVersions", "findVersionByID"]);

export const createAfterOperationHook = ({
  schemaCache,
  excludeValues,
  adminBasePath,
}: Args): CollectionAfterOperationHook => {
  return ({ operation, result, req }) => {
    if (!ENCODING_OPERATIONS.has(operation)) return result;
    if (!shouldEnrich(req, adminBasePath)) return result;

    const resolve = (slug: CollectionSlug) => schemaCache.get(slug, req.payload);

    if (operation === "find" || operation === "findVersions") {
      if (Array.isArray(result.docs)) {
        result.docs = result.docs.map((doc) => encodeStega(doc, resolve, excludeValues));
      }
      return result;
    }

    return encodeStega(result, resolve, excludeValues);
  };
};
