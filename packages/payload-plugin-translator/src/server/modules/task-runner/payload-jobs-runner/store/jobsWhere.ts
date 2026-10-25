import type { CollectionSlug, Where } from "payload";

/**
 * Conditions over a job row's document reference, which Payload stores in a `json` column and this
 * plugin has written in two shapes. The second `or` branch — and the numeric id {@link asStored}
 * offers for it — is the deprecated one: docs/DEPRECATIONS.md#jobs-input-collection-field
 */
export const ofCollection = (collectionSlug: CollectionSlug): Where => ({
  or: [
    { "input.collection_slug": { equals: collectionSlug } },
    { "input.collection.relationTo": { equals: collectionSlug } },
  ],
});

/**
 * A document id reaches the store as a string, but the legacy reference was written through a
 * relationship field, which stored a numeric collection's id as a **number**. Comparing one against
 * the other matches nothing — on every adapter, MongoDB included — so both forms are offered and the
 * store matches whichever it holds.
 */
const asStored = (documentId: string): Array<string | number> =>
  /^\d+$/u.test(documentId) ? [documentId, Number(documentId)] : [documentId];

export const ofDocuments = (documentIds: readonly string[]): Where => {
  const values = documentIds.flatMap(asStored);
  return {
    or: [{ "input.collection_id": { in: values } }, { "input.collection.value": { in: values } }],
  };
};
