import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";
import type { Pool } from "pg";

import { extractPersonText } from "@/collections/Person/extractPersonText";
import { upsertEmbedding, deleteEmbedding } from "@/lib/search/dbOperations";
import { generateEmbedding } from "@/lib/search/generateEmbedding";
import type { Person } from "@/payload-types";

// None of Person's fields are localized: unlike Page/Post/Insight, one save produces the same
// content for every locale (Person/index.ts has no `localized: true` field). Writing only the
// request's own locale would leave the other two site locales unable to find any person in search,
// since runSemanticSearch filters strictly by locale. Generating the embedding once and upserting
// it under all three site locales keeps this at one OpenAI call per save either way.
const SITE_LOCALES = ["en", "fr", "ja"] as const;

export const indexPersonEmbedding: CollectionAfterChangeHook<Person> = async ({ doc, req }) => {
  if (req.context?.skipEmbedding) {
    return doc;
  }

  try {
    const text = extractPersonText(doc);
    const embedding = await generateEmbedding(text);
    const { pool } = req.payload.db as unknown as { pool: Pool };

    await Promise.all(
      SITE_LOCALES.map((locale) =>
        upsertEmbedding({
          collection: "person",
          documentId: String(doc.id),
          embedding,
          locale,
          pool,
        })
      )
    );
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to index person embedding");
  }

  return doc;
};

export const deletePersonEmbedding: CollectionAfterDeleteHook<Person> = async ({ doc, req }) => {
  try {
    const { pool } = req.payload.db as unknown as { pool: Pool };
    await deleteEmbedding({
      collection: "person",
      documentId: String(doc.id),
      pool,
    });
  } catch (error) {
    req.payload.logger.error({ error }, "Failed to delete person embedding");
  }

  return doc;
};
