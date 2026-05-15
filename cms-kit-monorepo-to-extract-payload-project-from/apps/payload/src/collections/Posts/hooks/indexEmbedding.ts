import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from "payload";
import type { Pool } from "pg";

import { extractPostText } from "@/collections/Posts/extractPostText";
import { I18N_CONFIG } from "@/core/config/i18n";
import type { Post } from "@/payload-types";
import { upsertEmbedding, deleteEmbedding } from "@/search/dbOperations";
import { generateEmbedding } from "@/search/generateEmbedding";

export const indexPostEmbedding: CollectionAfterChangeHook<Post> = async ({
  doc,
  req,
}) => {
  if (doc._status !== "published") {return doc;}

  try {
    const locale = (req.locale ?? I18N_CONFIG.defaultLocale) as string;
    const text = extractPostText(doc);
    const embedding = await generateEmbedding(text);
    const {pool} = (req.payload.db as unknown as { pool: Pool });

    await upsertEmbedding({
      collection: "post",
      documentId: String(doc.id),
      embedding,
      locale,
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to index post embedding");
  }

  return doc;
};

export const deletePostEmbedding: CollectionAfterDeleteHook<Post> = async ({
  doc,
  req,
}) => {
  try {
    const {pool} = (req.payload.db as unknown as { pool: Pool });
    await deleteEmbedding({
      collection: "post",
      documentId: String(doc.id),
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to delete post embedding");
  }

  return doc;
};
