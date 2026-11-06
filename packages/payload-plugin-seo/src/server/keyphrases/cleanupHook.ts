import type { CollectionAfterDeleteHook } from "payload";
import { KEYPHRASES_COLLECTION_SLUG } from "../../constants";

export function createKeyphraseCleanupHook(collection: string): CollectionAfterDeleteHook {
  return async ({ id, req }) => {
    await req.payload.delete({
      collection: KEYPHRASES_COLLECTION_SLUG,
      where: {
        and: [{ docCollection: { equals: collection } }, { docId: { equals: String(id) } }],
      },
      overrideAccess: true,
      req,
    });
  };
}
