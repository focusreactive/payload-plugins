import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";
import type { Pool } from "pg";

import { extractPageText } from "@/collections/Page/extractPageText";
import { resolveGlobalBlocks } from "@/collections/Page/resolveGlobalBlocks";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import type { Page } from "@/payload-types";
import { upsertEmbedding, deleteEmbedding } from "@/lib/search/dbOperations";
import { generateEmbedding } from "@/lib/search/generateEmbedding";

// Depth to load a page at before extracting its search text. Some block extractors read a relationship
// (e.g. TestimonialsList reads the related testimonial's text), so the page must be populated past
// depth 0. Every path that re-indexes a page must use this same depth, or one path would overwrite the
// embedding another path wrote with more (or less) text.
export const PAGE_EMBEDDING_DEPTH = 2;

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
    const text = extractPageText(
      await resolveGlobalBlocks({ depth: PAGE_EMBEDDING_DEPTH, locale, page, req })
    );
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

// Locale fallback means a page can render different text per locale (its own content, or a fallback
// to another locale), so an edit in one locale must refresh every locale's embedding — not only the
// edited one. The same holds for global block edits (see revalidatePagesUsingGlobalBlock).
export async function reindexPageForAllLocales({
  pageId,
  req,
}: {
  pageId: number | string;
  req: PayloadRequest;
}): Promise<void> {
  for (const { code } of I18N_CONFIG.locales) {
    const locale = code as Locale;
    const page = await req.payload
      .findByID({
        collection: "page",
        depth: PAGE_EMBEDDING_DEPTH,
        id: pageId,
        locale,
        overrideAccess: true,
        req,
      })
      .catch(() => null);

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

  await reindexPageForAllLocales({ pageId: doc.id, req });

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
