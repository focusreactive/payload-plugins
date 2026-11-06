import type { CollectionSlug, Payload } from "payload";

import { mayInitiate } from "./permission.js";
import type { RebuiltRequester } from "./permission.js";

export type DocumentIds = readonly string[];

type BulkQuery = {
  payload: Payload;
  collection: CollectionSlug;
  ids: DocumentIds;
  user: RebuiltRequester | null;
};

/** Which of these documents the caller may not change, at one `update` evaluation per id. */
export async function refusedTargets(query: BulkQuery): Promise<Set<string>> {
  const { payload, collection, ids, user } = query;

  const verdicts = await Promise.all(
    ids.map(async (id) => ({
      id,
      mayChange: await mayInitiate({ payload, collection, id, user }),
    }))
  );
  return new Set(verdicts.filter(({ mayChange }) => !mayChange).map(({ id }) => id));
}
