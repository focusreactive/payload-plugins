import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";
import type { Pool } from "pg";

import { extractPageText } from "@/collections/Page/extractPageText";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import type { Page } from "@/payload-types";
import { upsertEmbedding, deleteEmbedding } from "@/lib/search/dbOperations";
import { generateEmbedding } from "@/lib/search/generateEmbedding";

const DEPTH_FOR_RELATED_TEXT = 1;

async function upsertPageEmbedding({
  locale,
  page,
  req,
}: {
  locale: Locale;
  page: Page;
  req: PayloadRequest;
}): Promise<void> {
  try {
    const embedding = await generateEmbedding(extractPageText(page));
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

// Locale fallback lets an edit in one locale change the text of the other locales.
async function reindexPageInEveryLocale({ id, req }: { id: number; req: PayloadRequest }) {
  for (const { code: locale } of I18N_CONFIG.locales) {
    const page = await req.payload.findByID({
      collection: "page",
      depth: DEPTH_FOR_RELATED_TEXT,
      disableErrors: true,
      id,
      locale,
      overrideAccess: true,
      req,
    });

    if (page?._status === "published") {
      await upsertPageEmbedding({ locale, page, req });
    }
  }
}

export const indexPageEmbedding: CollectionAfterChangeHook<Page> = async ({ doc, req }) => {
  if (doc._status !== "published") {
    return doc;
  }
  if (req.context?.skipEmbedding) {
    return doc;
  }

  await reindexPageInEveryLocale({ id: doc.id, req });

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
