import type { CollectionAfterDeleteHook } from "payload";
import { KEYPHRASES_COLLECTION_SLUG } from "../../constants";
import { rowWhere } from "./rows";

export function createKeyphraseCleanupHook(collection: string): CollectionAfterDeleteHook {
  return async ({ id, req }) => {
    await req.payload.delete({
      collection: KEYPHRASES_COLLECTION_SLUG,
      where: rowWhere({ collection, docId: String(id) }),
      overrideAccess: true,
      req,
    });
  };
}
