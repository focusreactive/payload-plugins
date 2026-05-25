import type { CollectionAfterDeleteHook } from "payload";
import { COMMENT_READS_COLLECTION_SLUG } from "../../constants";

export const cascadeDeleteCommentReads: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (!doc?.id) return;

  try {
    await req.payload.delete({
      collection: COMMENT_READS_COLLECTION_SLUG,
      where: { comment: { equals: doc.id } },
      overrideAccess: true,
      req,
    });
  } catch (err) {
    req.payload.logger?.error?.({ err, msg: "cascadeDeleteCommentReads: failed to clear read rows" });
  }
};
