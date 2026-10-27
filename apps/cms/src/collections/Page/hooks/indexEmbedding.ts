import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";
import type { Pool } from "pg";

import { extractPageText } from "@/collections/Page/extractPageText";
import { resolveGlobalBlocks } from "@/collections/Page/resolveGlobalBlocks";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import type { Locale } from "@/lib/types";
import type { Page } from "@/payload-types";
import { upsertEmbedding, deleteEmbedding } from "@/lib/search/dbOperations";
import { generateEmbedding } from "@/lib/search/generateEmbedding";

export async function upsertPageEmbedding({
  locale,
  page,
  req,
}: {
  locale: Locale;
  page: Page;
  req: PayloadRequest;
}): Promise<void> {
  try {
    const text = extractPageText(await resolveGlobalBlocks({ locale, page, req }));
    const embedding = await generateEmbedding(text);
    const { pool } = req.payload.db as unknown as { pool: Pool };

    await upsertEmbedding({
      collection: "page",
      documentId: String(page.id),
      embedding,
      locale,
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to index page embedding");
  }
}

export const indexPageEmbedding: CollectionAfterChangeHook<Page> = async ({ doc, req }) => {
  if (doc._status !== "published") {
    return doc;
  }
  if (req.context?.skipEmbedding) {
    return doc;
  }

  await upsertPageEmbedding({ locale: getLocaleFromRequest(req), page: doc, req });

  return doc;
};

export const deletePageEmbedding: CollectionAfterDeleteHook<Page> = async ({ doc, req }) => {
  try {
    const { pool } = req.payload.db as unknown as { pool: Pool };
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
