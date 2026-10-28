import type { CollectionSlug } from "payload";

export type PageCollectionOptions = {
  /** Field holding the page's segment. Added as a text field if the collection lacks it. */
  segmentField?: string;
  /** Field used as the page's name in the tree. */
  titleField?: string;
  /** Name in the Create menu and the Type column. */
  label?: string;
};

/** The full options type arrives with P-03; this is the part the scaffold needs. */
export type FoldersPluginOptions = {
  /** Opted-in page collections, keyed by slug. */
  collections: Partial<Record<CollectionSlug, true | PageCollectionOptions>>;
  /** Keeps the schema, removes hooks, endpoints and UI. */
  disabled?: boolean;
};
