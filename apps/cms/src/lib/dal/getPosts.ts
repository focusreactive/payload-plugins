import type { Payload } from "payload";
import { cache } from "react";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  overrideAccess?: boolean;
  locale?: Locale;
  category?: string;
  /** Author slug. */
  author?: string;
  /** Plain-text search over title and excerpt. */
  query?: string;
}

async function getPostsQuery(
  payload: Payload,
  page: number,
  limit: number,
  locale: Locale,
  category: string | undefined,
  author: string | undefined,
  query: string | undefined
) {
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
      _status: {
        equals: "published",
      },
      ...(category && {
        "categories.slug": { equals: category },
      }),
      ...(author && {
        "authors.slug": { equals: author },
      }),
      ...(query && {
        or: [{ title: { like: query } }, { excerpt: { like: query } }],
      }),
    },
  });
}

const getPostsCached = cache(
  async (
    payload: Payload,
    page: number,
    limit: number,
    locale: Locale,
    category: string | undefined,
    author: string | undefined,
    query: string | undefined
  ) =>
    scopedCache(
      () => getPostsQuery(payload, page, limit, locale, category, author, query),
      [page.toString(), limit.toString(), locale, category ?? "", author ?? "", query ?? ""],
      {
        tags: [cacheTag({ locale, type: "postsList" })],
      }
    )()
);

export const getPosts = async (payload: Payload, options: GetPostsOptions) => {
  const { page = 1, limit = BLOG_CONFIG.postsPerPage, locale, category, author, query } = options;

  const resolvedLocale = await resolveLocale(locale);

  return getPostsCached(payload, page, limit, resolvedLocale, category, author, query);
};
