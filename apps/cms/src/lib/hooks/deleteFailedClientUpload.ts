import { del } from "@vercel/blob";
import type { CollectionAfterErrorHook, CollectionBeforeValidateHook } from "payload";

const CLIENT_UPLOAD_KEY = "clientUploadKey";

interface UploadDestination {
  _objectKey?: string | null;
  filename?: string | null;
  prefix?: string | null;
}

export const rememberClientUploadKey: CollectionBeforeValidateHook = ({ data, req }) => {
  const { _objectKey, filename, prefix } = (data ?? {}) as UploadDestination;

  if (_objectKey && filename) {
    req.context[CLIENT_UPLOAD_KEY] = [prefix, _objectKey, filename].filter(Boolean).join("/");
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
