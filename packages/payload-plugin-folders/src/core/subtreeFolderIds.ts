import type { Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId } from "../types.js";
import { getResolvedOptions } from "./runtime.js";

/**
 * The ids of `folder` and every folder beneath it, for an access function that confines a user to
 * one subtree. It reads without access checks, ids only: the caller decides who may know them.
 * `ancestorIds` is slash-delimited (`/1/4/`), so `contains /4/` matches that id and no other.
 * A folder that does not exist gives an empty list. Inside an access function, pass a shallow
 * copy of the request as `req`: the read then joins the request's transaction instead of waiting
 * for a second connection, and a nested call cannot change the request's context or locale.
 */
export const getSubtreeFolderIds = async (
  payload: Payload,
  { folder, req }: { folder: FolderId; req?: Partial<PayloadRequest> }
): Promise<FolderId[]> => {
  const { docs } = (await payload.db.find({
    collection: toCollectionSlug(getResolvedOptions(payload).folders.slug),
    pagination: false,
    req: req as PayloadRequest | undefined,
    select: { id: true },
    where: { or: [{ id: { equals: folder } }, { ancestorIds: { contains: `/${folder}/` } }] },
  })) as { docs: Array<{ id: FolderId }> };

  return docs.map((doc) => doc.id);
};
