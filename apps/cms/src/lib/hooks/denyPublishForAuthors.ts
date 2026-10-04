import { APIError } from "payload";
import type { CollectionBeforeChangeHook } from "payload";

/**
 * Editorial workflow (§5.7): authors save drafts, an editor or admin publishes. Rejects any write
 * by an `author` that would leave the document published — publishing a draft, or saving changes
 * straight onto a published document.
 */
export const denyPublishForAuthors: CollectionBeforeChangeHook = ({ data, req }) => {
  const role = req.user && "role" in req.user ? req.user.role : undefined;

  if (role === "author" && data?._status === "published") {
    throw new APIError("Authors save drafts; an editor publishes.", 403, null, true);
  }

  return data;
};
