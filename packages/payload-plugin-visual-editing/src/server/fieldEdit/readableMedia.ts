import type { Payload } from "payload";

import type { User } from "./draftField.js";

import { idOfCollection } from "../unsavedRichText/postedRequest.js";

export const readableMediaIdOf = async (
  payload: Payload,
  user: User,
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
