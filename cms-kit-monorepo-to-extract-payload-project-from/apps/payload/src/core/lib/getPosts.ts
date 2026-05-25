import { unstable_cache } from "next/cache";
import type { Payload } from "payload";
import { cache } from "react";

import { BLOG_CONFIG } from "@/core/config/blog";
import type { Locale } from "@/core/types";

import { cacheTag } from "./cacheTags";
import { resolveLocale } from "./resolveLocale";

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  overrideAccess?: boolean;
  locale?: Locale;
  categories?: string[];
}

const getPostsQuery = cache(
  async (payload: Payload, options: GetPostsOptions) => {
    const {
      page = 1,
      limit = BLOG_CONFIG.postsPerPage,
      overrideAccess = false,
      locale,
      categories,
    } = options;

    return await payload.find({
      collection: BLOG_CONFIG.collection,
      depth: 1,
      limit,
      locale,
      overrideAccess,
      page,
      select: {
        authors: true,
        categories: true,
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
        ...(categories?.length && {
          "categories.slug": { in: categories },
        }),
      },
    });
  }
);

export const getPosts = async (payload: Payload, options: GetPostsOptions) => {
  const {
    page = 1,
    limit = BLOG_CONFIG.postsPerPage,
    locale,
    categories,
  } = options;

  const resolvedLocale = await resolveLocale(locale);

  return unstable_cache(
    async () =>
      getPostsQuery(payload, {
        categories,
        limit,
        locale: resolvedLocale,
        page,
      }),
    [page.toString(), limit.toString(), resolvedLocale, ...(categories ?? [])],
    {
      tags: [cacheTag({ locale: resolvedLocale, type: "postsList" })],
    }
  )();
};
