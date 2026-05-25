import type { CollectionSlug, Payload } from "payload";

/**
 * Checks if collection is available for translation
 */
export function isCollectionAvailable(
  collectionSlug: string,
  availableCollections: Set<CollectionSlug>
): CollectionSlug | null {
  return availableCollections.has(collectionSlug) ? collectionSlug : null;
}

/**
 * Gets all document IDs from a collection (for select_all option)
 */
export async function getAllCollectionIds(
  payload: Payload,
  collectionSlug: CollectionSlug
): Promise<string[]> {
  const result = await payload.find({
    collection: collectionSlug,
    depth: 0,
    pagination: false,
    select: { id: true },
  });
  return result.docs.map((doc) => String(doc.id));
}
