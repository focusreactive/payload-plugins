import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";
import type { Pool } from "pg";

import { extractPageText } from "@/collections/Page/extractPageText";
import { isServicePage } from "@/collections/Page/isServicePage";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import type { Page } from "@/payload-types";
import { upsertEmbedding, deleteEmbedding } from "@/lib/search/dbOperations";
import { generateEmbedding } from "@/lib/search/generateEmbedding";

export const indexPageEmbedding: CollectionAfterChangeHook<Page> = async ({ doc, req }) => {
  if (doc._status !== "published") {
    return doc;
  }
  if (req.context?.skipEmbedding) {
    return doc;
  }

  try {
    const locale = getLocaleFromRequest(req);
    const text = extractPageText(doc);
    const embedding = await generateEmbedding(text);
    const { pool } = req.payload.db as unknown as { pool: Pool };

    // A page under Services is indexed as "service" instead of "page" so it shows up as its own
    // search-result group with its own label; it is never indexed as both, or the same page would
    // appear twice in results for one query.
    await upsertEmbedding({
      collection: isServicePage(doc.breadcrumbs) ? "service" : "page",
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

export const deletePageEmbedding: CollectionAfterDeleteHook<Page> = async ({ doc, req }) => {
  try {
    const { pool } = req.payload.db as unknown as { pool: Pool };
    // The row could have been indexed under either tag depending on where the page lived at the
    // time, and doc here no longer has reliable breadcrumbs to re-derive that - delete both so a
    // moved-then-deleted service page cannot leave an orphaned row under the other collection.
    await Promise.all([
      deleteEmbedding({ collection: "page", documentId: String(doc.id), pool }),
      deleteEmbedding({ collection: "service", documentId: String(doc.id), pool }),
    ]);
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to delete page embedding");
  }

  return doc;
};
