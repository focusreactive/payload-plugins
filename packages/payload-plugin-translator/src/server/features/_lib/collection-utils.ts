import type { CollectionSlug } from "payload";

/**
 * Checks if collection is available for translation
 */
export function isCollectionAvailable(
  collectionSlug: string,
  availableCollections: Set<CollectionSlug>
): CollectionSlug | null {
  return availableCollections.has(collectionSlug) ? collectionSlug : null;
}
