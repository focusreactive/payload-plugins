import { unstable_cache } from "next/cache";
import type { Pool } from "pg";
import { cache } from "react";

import { BLOG_CONFIG } from "@/core/config/blog";
import { cacheTag } from "@/core/lib/cacheTags";
import { resolveLocale } from "@/core/lib/resolveLocale";
import type { Locale } from "@/core/types";
import { orderDocsByIds } from "@/core/utils/orderDocsByIds";
import { generateEmbedding } from "@/search/generateEmbedding";

import type { getPosts } from "./getPosts";
import { getPayloadClient } from "./payload-client";
import { runPostSemanticSearch } from "./runPostSemanticSearch";

type PostsResult = Awaited<ReturnType<typeof getPosts>>;

export interface SearchPostsOptions {
  query: string;
  page?: number;
  limit?: number;
  locale?: Locale;
  category?: string;
}

function emptyResult(page: number, limit: number): PostsResult {
  return {
    docs: [],
    hasNextPage: false,
    hasPrevPage: false,
    limit,
    nextPage: null,
    page,
    pagingCounter: 0,
    prevPage: null,
    totalDocs: 0,
    totalPages: 0,
  };
}

async function searchPostsQuery(
  query: string,
  page: number,
  limit: number,
  locale: Locale,
  category: string | undefined
): Promise<PostsResult> {
  const payload = await getPayloadClient();
  const embedding = await generateEmbedding(query);
  const pool = payload.db.pool as unknown as Pool;

  const { ids, total } = await runPostSemanticSearch({
    category,
    embedding,
    limit,
    locale,
    offset: (page - 1) * limit,
    pool,
  });

  if (ids.length === 0) {
    return emptyResult(page, limit);
  }

  const { docs } = await payload.find({
    collection: BLOG_CONFIG.collection,
    depth: 2,
    limit: ids.length,
    locale,
    overrideAccess: true,
    pagination: false,
    select: {
      authors: true,
      categories: true,
      content: true,
      excerpt: true,
      heroImage: true,
      meta: true,
      publishedAt: true,
      slug: true,
      title: true,
      updatedAt: true,
    },
    where: { id: { in: ids } },
  });

  const ordered = orderDocsByIds(docs, ids);
  const totalPages = Math.ceil(total / limit);

  return {
    docs: ordered,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    limit,
    nextPage: page < totalPages ? page + 1 : null,
    page,
    pagingCounter: (page - 1) * limit + 1,
    prevPage: page > 1 ? page - 1 : null,
    totalDocs: total,
    totalPages,
  };
}

const searchPostsCached = cache(
  async (
    query: string,
    page: number,
    limit: number,
    locale: Locale,
    category: string | undefined
  ) =>
    unstable_cache(
      () => searchPostsQuery(query, page, limit, locale, category),
      ["searchPosts", query, page.toString(), limit.toString(), locale, category ?? ""],
      {
        tags: [cacheTag({ locale, type: "postsList" })],
      }
    )()
);

export const searchPosts = async ({
  query,
  page = 1,
  limit = BLOG_CONFIG.postsPerPage,
  locale,
  category,
}: SearchPostsOptions): Promise<PostsResult> => {
  const resolvedLocale = await resolveLocale(locale);

  try {
    return await searchPostsCached(query, page, limit, resolvedLocale, category);
  } catch (error) {
    console.error("[searchPosts] error:", error);
    return emptyResult(page, limit);
  }
};
