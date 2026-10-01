import { del } from "@vercel/blob";
import type { CollectionAfterErrorHook, CollectionBeforeValidateHook } from "payload";

import type { Media } from "@/payload-types";

const CLIENT_UPLOAD_KEY = "clientUploadKey";

export const rememberClientUploadKey: CollectionBeforeValidateHook<Media> = ({ data, req }) => {
  if (data?._objectKey && data.filename) {
    req.context[CLIENT_UPLOAD_KEY] = [data.prefix, data._objectKey, data.filename]
      .filter(Boolean)
      .join("/");
  }

  return data;
};

export const deleteFailedClientUpload: CollectionAfterErrorHook = async ({ req }) => {
  const key = req.context[CLIENT_UPLOAD_KEY];
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (typeof key !== "string" || !token) {
    return;
  }

  try {
    await del(key, { token });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: `Could not delete failed client upload ${key}` });
  }
};
