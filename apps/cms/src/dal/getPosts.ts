import { unstable_cache } from "next/cache";
import type { Payload } from "payload";
import { cache } from "react";

import { BLOG_CONFIG } from "@/core/config/blog";
import { cacheTag } from "@/core/lib/cacheTags";
import { resolveLocale } from "@/core/lib/resolveLocale";
import type { Locale } from "@/core/types";

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  overrideAccess?: boolean;
  locale?: Locale;
  category?: string;
}

async function getPostsQuery(
  payload: Payload,
  page: number,
  limit: number,
  locale: Locale,
  category: string | undefined
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
      content: true,
      excerpt: true,
      heroImage: true,
      meta: true,
      publishedAt: true,
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
    },
  });
}

const getPostsCached = cache(
  async (
    payload: Payload,
    page: number,
    limit: number,
    locale: Locale,
    category: string | undefined
  ) =>
    unstable_cache(
      () => getPostsQuery(payload, page, limit, locale, category),
      [page.toString(), limit.toString(), locale, category ?? ""],
      {
        tags: [cacheTag({ locale, type: "postsList" })],
      }
    )()
);

export const getPosts = async (payload: Payload, options: GetPostsOptions) => {
  const { page = 1, limit = BLOG_CONFIG.postsPerPage, locale, category } = options;

  const resolvedLocale = await resolveLocale(locale);

  return getPostsCached(payload, page, limit, resolvedLocale, category);
};
