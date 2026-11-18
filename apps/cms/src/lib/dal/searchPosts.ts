import { cache } from "react";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";

import type { getPosts } from "./getPosts";
import { getPayloadClient } from "./payload-client";

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

  return await payload.find({
    collection: BLOG_CONFIG.collection,
    depth: 2,
    limit,
    locale,
    overrideAccess: true,
    page,
    select: {
      authors: true,
      categories: true,
      excerpt: true,
      heroImage: true,
      meta: true,
      publishedAt: true,
      readingTime: true,
      slug: true,
      title: true,
      updatedAt: true,
    },
    sort: "-publishedAt",
    where: {
      _status: { equals: "published" },
      title: { like: query },
      ...(category && {
        "categories.slug": { equals: category },
      }),
    },
  });
}

const searchPostsCached = cache(
  async (
    query: string,
    page: number,
    limit: number,
    locale: Locale,
    category: string | undefined
  ) =>
    scopedCache(
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
