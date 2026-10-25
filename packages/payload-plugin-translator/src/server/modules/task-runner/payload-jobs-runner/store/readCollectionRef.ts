import type { CollectionSlug } from "payload";

import { z } from "zod";

import type { ID } from "../../types.js";
import { StoredInputSchema } from "./jobInput.schema.js";
import type { StoredCollectionFields } from "./types.js";

export type CollectionRef = {
  collectionSlug: CollectionSlug;
  collectionId: ID;
};

/**
 * A text field cleared through Payload's admin reads back as `null`, not as missing. For this row
 * the two mean the same thing — there is no reference here, look at the legacy one.
 */
const clearedIsAbsent = (row: unknown): unknown =>
  row && typeof row === "object"
    ? Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null))
    : row;

const CollectionRefSchema = z.preprocess(
  clearedIsAbsent,
  StoredInputSchema.pick({
    collection_slug: true,
    collection_id: true,
    collection: true,
  }).transform(
    (input): CollectionRef => ({
      collectionSlug: (input.collection_slug ??
        input.collection?.relationTo ??
        "") as CollectionSlug,
      collectionId: String(input.collection_id ?? input.collection?.value ?? ""),
    })
  )
);

const NOTHING: CollectionRef = { collectionSlug: "" as CollectionSlug, collectionId: "" };

/**
 * The single storage-read boundary for a job's collection reference, and the one place allowed to
 * read the legacy relationship a row carried before those references became ID-agnostic.
 * See docs/DEPRECATIONS.md#jobs-input-collection-field
 */
export function readCollectionRef(input: StoredCollectionFields | undefined): CollectionRef {
  const read = CollectionRefSchema.safeParse(input ?? {});
  return read.success ? read.data : NOTHING;
}
