import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from "payload";
import type { Pool } from "pg";

import { extractPageText } from "@/collections/Page/extractPageText";
import { I18N_CONFIG } from "@/core/config/i18n";
import type { Page } from "@/payload-types";
import { upsertEmbedding, deleteEmbedding } from "@/search/dbOperations";
import { generateEmbedding } from "@/search/generateEmbedding";

export const indexPageEmbedding: CollectionAfterChangeHook<Page> = async ({
  doc,
  req,
}) => {
  if (doc._status !== "published") {return doc;}

  try {
    const locale = (req.locale ?? I18N_CONFIG.defaultLocale) as string;
    const text = extractPageText(doc);
    const embedding = await generateEmbedding(text);
    const {pool} = (req.payload.db as unknown as { pool: Pool });

    await upsertEmbedding({
      collection: "page",
      documentId: String(doc.id),
      embedding,
      locale,
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to index page embedding");
  }

  return doc;
};

export const deletePageEmbedding: CollectionAfterDeleteHook<Page> = async ({
  doc,
  req,
}) => {
  try {
    const {pool} = (req.payload.db as unknown as { pool: Pool });
    await deleteEmbedding({
      collection: "page",
      documentId: String(doc.id),
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to delete page embedding");
  }

  return doc;
};
