type CollectionSlug = string;
type DocumentId = string;

/** The ids of one list page, joined in page order; a different page is a different list. */
export type IdsKey = string;

export type TranslationKey = readonly unknown[];

const all = ["translation"] as const;
const legacy = [...all, "legacy"] as const;
const legacyStaleness = [...legacy, "staleness"] as const;

/** Every key is a child of `all`, so refreshing `all` refreshes every translation read. */
export const translationKeys = {
  all,
  document: (collection: CollectionSlug, id: DocumentId) =>
    [...all, "document", collection, id] as const,
  list: (collection: CollectionSlug, idsKey: IdsKey) =>
    [...all, "list", collection, idsKey] as const,
  legacy: {
    documentStatus: (collection: CollectionSlug, id: DocumentId) =>
      [...legacy, "document-status", collection, id] as const,
    collectionStatus: (collection: CollectionSlug) =>
      [...legacy, "collection-status", collection] as const,
    everyStaleness: legacyStaleness,
    staleness: (collection: CollectionSlug, id: DocumentId) =>
      [...legacyStaleness, collection, id] as const,
  },
};
