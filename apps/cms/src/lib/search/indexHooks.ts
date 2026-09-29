/**
 * The afterChange/afterDelete pair that keeps a collection's rows in the semantic index.
 *
 * A factory rather than another hand-written pair, because Page's and Post's two copies
 * (`collections/Page/hooks/indexEmbedding.ts`, `collections/Posts/hooks/indexEmbedding.ts`) had
 * already drifted: one honours `req.context.skipEmbedding` and the other does not, so a bulk
 * import that sets that flag re-embeds every post and none of the pages. Talk and Topic use this;
 * moving the other two onto it is worth doing and is not part of this change.
 *
 * Nothing here throws. A failed embedding must not fail the editor's save: a talk that saved but
 * did not index is missing from search until it is saved again, where a talk that refused to save
 * is lost work.
 */

import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";
import type { Pool } from "pg";

import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";

import { deleteEmbedding, upsertEmbedding } from "./dbOperations";
import { generateEmbedding } from "./generateEmbedding";
import type { SearchCollection } from "./types";

interface IndexedDocument {
  id: number | string;
  _status?: string | null;
}

interface EmbeddingHooks<T extends IndexedDocument> {
  afterChange: CollectionAfterChangeHook<T>[];
  afterDelete: CollectionAfterDeleteHook<T>[];
}

interface BuildEmbeddingHooksOptions<T extends IndexedDocument> {
  collection: SearchCollection;
  /** The one string the whole document is embedded as. */
  extractText: (doc: T) => string;
  /**
   * Whether an unpublished document is skipped. True for anything with drafts enabled, so a draft
   * never turns up in a visitor's search results; false for a collection with no draft state at
   * all, where `_status` is always undefined and gating on it would index nothing.
   */
  requirePublished: boolean;
}

export function buildEmbeddingHooks<T extends IndexedDocument>({
  collection,
  extractText,
  requirePublished,
}: BuildEmbeddingHooksOptions<T>): EmbeddingHooks<T> {
  const afterChange: CollectionAfterChangeHook<T> = async ({ doc, req }) => {
    // Set by the seed and import scripts, which write hundreds of documents in a loop. Without it
    // each one would wait on its own OpenAI round trip.
    if (req.context?.skipEmbedding) return doc;

    try {
      // Unpublishing has to evict, not merely skip. The existing Page and Post hooks only ever
      // write on publish and only ever delete on hard delete, and `runSemanticSearch` applies no
      // status filter of its own - so a published-then-unpublished document stays findable at
      // /search forever. On a paywalled collection that is worse than a stale result: the row
      // carries a title an editor deliberately withdrew.
      if (requirePublished && doc._status !== "published") {
        const { pool } = req.payload.db as unknown as { pool: Pool };
        await deleteEmbedding({ collection, documentId: String(doc.id), pool });
        return doc;
      }

      const text = extractText(doc);
      // An empty string embeds to a vector that is near-equidistant from every query, so the
      // document would surface for anything rather than for nothing.
      if (!text) return doc;

      const embedding = await generateEmbedding(text);
      const { pool } = req.payload.db as unknown as { pool: Pool };

      await upsertEmbedding({
        collection,
        documentId: String(doc.id),
        embedding,
        locale: getLocaleFromRequest(req),
        pool,
      });
    } catch (error) {
      req.payload.logger.error({ error }, `Failed to index ${collection} embedding`);
    }

    return doc;
  };

  const afterDelete: CollectionAfterDeleteHook<T> = async ({ doc, req }) => {
    try {
      const { pool } = req.payload.db as unknown as { pool: Pool };
      await deleteEmbedding({ collection, documentId: String(doc.id), pool });
    } catch (error) {
      req.payload.logger.error({ error }, `Failed to delete ${collection} embedding`);
    }

    return doc;
  };

  return { afterChange: [afterChange], afterDelete: [afterDelete] };
}
