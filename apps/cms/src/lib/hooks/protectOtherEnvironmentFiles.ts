import { APIError } from "payload";
import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from "payload";

import { getMediaStoragePrefix } from "@/lib/storage/mediaStoragePrefix";
import type { Media } from "@/payload-types";

function assertFileBelongsToThisEnvironment(filePrefix: string | null | undefined) {
  if ((filePrefix ?? "") === getMediaStoragePrefix()) {
    return;
  }

  throw new APIError(
    "This file belongs to another environment, so it can not be deleted or replaced here. Upload a new file instead.",
    403,
    undefined,
    true
  );
}

export const protectOtherEnvironmentFilesOnDelete: CollectionBeforeDeleteHook = async ({
  collection,
  id,
  req,
}) => {
  const media = await req.payload.findByID({
    collection: collection.slug as "media",
    depth: 0,
    id,
    req,
  });

  assertFileBelongsToThisEnvironment(media.prefix);
};

export const protectOtherEnvironmentFilesOnReplace: CollectionBeforeChangeHook<Media> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === "update" && req.file) {
    assertFileBelongsToThisEnvironment(originalDoc?.prefix);
  }

  return data;
};
