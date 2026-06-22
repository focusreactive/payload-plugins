import type { Pool } from "pg";

import type { Locale } from "@/core/types";

interface DbRow {
  post_id: number;
  total: string;
}

export interface RunPostSemanticSearchParams {
  pool: Pool;
  embedding: number[];
  locale: Locale;
  category?: string;
  limit: number;
  offset: number;
  scoreThreshold?: number;
}

export interface RunPostSemanticSearchResult {
  ids: number[];
  total: number;
}

export async function runPostSemanticSearch({
  pool,
  embedding,
  locale,
  category,
  limit,
  offset,
  scoreThreshold = 0.75,
}: RunPostSemanticSearchParams): Promise<RunPostSemanticSearchResult> {
  const vectorStr = `[${embedding.join(",")}]`;

  const { rows } = await pool.query<DbRow>(
    `WITH ranked AS (
       SELECT
         p.id AS post_id,
         de.embedding <=> $1::vector AS distance
       FROM document_embeddings de
       JOIN posts p ON p.id::text = de.document_id
       WHERE de.collection = 'post'
         AND de.locale = $2
         AND p._status = 'published'
         AND de.embedding <=> $1::vector < $3
         AND (
           $4::text IS NULL
           OR EXISTS (
             SELECT 1
             FROM posts_rels pr
             JOIN categories c ON c.id = pr.categories_id
             WHERE pr.parent_id = p.id
               AND pr.path = 'categories'
               AND c.slug = $4
           )
         )
     )
     SELECT
       post_id,
       COUNT(*) OVER() AS total
     FROM ranked
     ORDER BY distance ASC
     LIMIT $5 OFFSET $6`,
    [vectorStr, locale, scoreThreshold, category ?? null, limit, offset]
  );

  return {
    ids: rows.map((row) => row.post_id),
    total: rows.length > 0 ? Number.parseInt(rows[0].total, 10) : 0,
  };
}
