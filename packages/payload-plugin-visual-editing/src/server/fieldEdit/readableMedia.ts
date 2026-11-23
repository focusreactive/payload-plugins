import type { SignedInRequest } from "./draftField.js";

import { idOfCollection } from "../unsavedRichText/postedRequest.js";

export const readableMediaIdOf = async (
  { payload, user }: SignedInRequest,
  collection: string,
  postedId: string
): Promise<number | string | null> => {
  const id = idOfCollection(payload, collection, postedId);
  if (id === null) return null;
  const media: unknown = await payload.findByID({
    collection,
    context: { visualEditing: false },
    depth: 0,
    disableErrors: true,
    id,
    overrideAccess: false,
    user,
  });
  return media ? id : null;
};
