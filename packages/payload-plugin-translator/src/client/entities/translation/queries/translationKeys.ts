type CollectionSlug = string;
type DocumentId = string;

/** The ids of one list page, joined in page order; a different page is a different list. */
export type IdsKey = string;

export type TranslationKey = readonly unknown[];

const all = ["translation"] as const;

/** Every key is a child of `all`, so refreshing `all` refreshes every translation read. */
export const translationKeys = {
  all,
  document: (collection: CollectionSlug, id: DocumentId) =>
    [...all, "document", collection, id] as const,
  list: (collection: CollectionSlug, idsKey: IdsKey) =>
    [...all, "list", collection, idsKey] as const,
};

/**
 * The ids a collection list's query matches, read from Payload, not from the plugin. Spelled here so
 * every key has one home; outside `all`, so a translation refresh does not read them again.
 */
export const viewIdsKey = (collection: CollectionSlug, locale: string, whereKey: string) =>
  ["payload", "view-ids", collection, locale, whereKey] as const;
