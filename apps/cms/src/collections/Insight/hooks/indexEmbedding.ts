import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";
import type { Pool } from "pg";

import { extractInsightText } from "@/collections/Insight/extractInsightText";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import type { Insight } from "@/payload-types";
import { upsertEmbedding, deleteEmbedding } from "@/lib/search/dbOperations";
import { generateEmbedding } from "@/lib/search/generateEmbedding";

// Insight carries no draft/publish workflow (no _status field, unlike Page and Post), so every
// save here is already the live version and there is no "published" gate to check.
export const indexInsightEmbedding: CollectionAfterChangeHook<Insight> = async ({ doc, req }) => {
  if (req.context?.skipEmbedding) {
    return doc;
  }

  try {
    const locale = getLocaleFromRequest(req);
    const text = extractInsightText(doc);
    const embedding = await generateEmbedding(text);
    const { pool } = req.payload.db as unknown as { pool: Pool };

    await upsertEmbedding({
      collection: "insight",
      documentId: String(doc.id),
      embedding,
      locale,
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to index insight embedding");
  }

  return doc;
};

export const deleteInsightEmbedding: CollectionAfterDeleteHook<Insight> = async ({ doc, req }) => {
  try {
    const { pool } = req.payload.db as unknown as { pool: Pool };
    await deleteEmbedding({
      collection: "insight",
      documentId: String(doc.id),
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to delete insight embedding");
  }

  return doc;
};
