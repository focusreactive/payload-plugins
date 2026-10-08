import type { CollectionSlug, Payload } from "payload";

import { enforcedAtTheRead } from "../../shared/payload/enforcedAtTheRead.js";

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
  collectionSlug: CollectionSlug,
  user: Record<string, unknown> | null = null
): Promise<string[]> {
  const result = await payload.find({
    collection: collectionSlug,
    pagination: false,
    depth: 0,
    select: { id: true },
    ...enforcedAtTheRead(user),
  });
  return result.docs.map((doc) => String(doc.id));
}

/**
 * One query however many ids: Payload folds a read rule into the query rather than answering per
 * document (`collections/operations/find.js`).
 */
export async function visibleIds(
  payload: Payload,
  collectionSlug: CollectionSlug,
  ids: readonly string[],
  user: Record<string, unknown> | null
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const result = await payload.find({
    collection: collectionSlug,
    pagination: false,
    depth: 0,
    select: { id: true },
    where: { id: { in: [...ids] } },
    ...enforcedAtTheRead(user),
  });
  return new Set(result.docs.map((doc) => String(doc.id)));
}
