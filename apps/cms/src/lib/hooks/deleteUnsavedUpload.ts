import { del } from "@vercel/blob";
import type { CollectionAfterErrorHook } from "payload";

export const deleteUnsavedUpload: CollectionAfterErrorHook = async ({ collection, req }) => {
  const filename = req.file?.name;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!filename || !token) {
    return;
  }

  try {
    const { totalDocs } = await req.payload.count({
      collection: collection.slug as "media",
      where: { filename: { equals: filename } },
    });

    if (totalDocs === 0) {
      await del(filename, { token });
    }
  } catch (error) {
    req.payload.logger.error({ err: error, msg: `Could not delete unsaved upload ${filename}` });
  }
};
