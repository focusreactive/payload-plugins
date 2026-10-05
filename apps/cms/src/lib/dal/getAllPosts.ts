import { cache } from "react";

import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Locale } from "@/lib/types";
import { cacheTag } from "@/lib/utils/cacheTags";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import { scopedCache } from "@/lib/utils/scopedCache";

import { getPayloadClient } from "./payload-client";

async function query(locale: Locale) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: BLOG_CONFIG.collection,
    depth: 1,
    locale,
    overrideAccess: true,
    pagination: false,
    select: { authors: true, excerpt: true, publishedAt: true, slug: true, title: true },
    sort: "-publishedAt",
    where: { _status: { equals: "published" } },
  });
  return docs;
}

/** Every published post, newest first, for the full archive (/archives.html). */
export const getAllPosts = cache(async ({ locale }: { locale?: Locale } = {}) => {
  const resolvedLocale = await resolveLocale(locale);
  return scopedCache(() => query(resolvedLocale), ["allPosts", resolvedLocale], {
    tags: [cacheTag({ locale: resolvedLocale, type: "postsList" })],
  })();
});
