import type { CollectionSlug } from "payload";

import type { ID } from "../types";
import type { PayloadJob } from "./types";

/**
 * Normalized, ID-agnostic document reference parsed out of a stored job input.
 */
export type CollectionRef = {
  collectionSlug: CollectionSlug;
  collectionId: ID;
};

/**
 * Single storage-read boundary for a job's collection reference.
 *
 * Reads the current flat-text shape (`collection_slug` / `collection_id`) and
 * falls back to the legacy relationship shape (`collection.{relationTo,value}`)
 * for jobs queued before the ID-agnostic migration. This is the one place a
 * stored id is coerced to string — the coercion exists only because the legacy
 * relationship `value` is typed `string | number`, and it goes away together
 * with the legacy field in the next major.
 * See docs/DEPRECATIONS.md#jobs-input-collection-field
 */
export function readCollectionRef(input: PayloadJob["input"]): CollectionRef {
  // `??` is intentional: `collection_slug` / `collection_id` are `required: true`
  // in the inputSchema, so they are never an empty string for any job this plugin
  // writes. The fallback to the legacy shape therefore only fires when the new
  // field is genuinely absent (i.e. a job queued before the ID-agnostic migration).
  return {
    collectionSlug: (input?.collection_slug ?? input?.collection?.relationTo ?? "") as CollectionSlug,
    collectionId: String(input?.collection_id ?? input?.collection?.value ?? ""),
  };
}
