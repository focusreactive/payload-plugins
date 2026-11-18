import type { CollectionSlug, Payload } from "payload";

import { enforcedAtTheRead } from "./enforcedAtTheRead.js";

/** The ids of every document in `collection` that `user` may read; with no `user` the read is unchecked. */
export async function getAllCollectionIds(
  payload: Payload,
  collectionSlug: CollectionSlug,
  user: Record<string, unknown> | null
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
 * Which of `ids` the reader may see: Payload folds the host's `read` rule into the query rather than
 * answering per document (`collections/operations/find.js`), so one `find` answers for all of them.
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
