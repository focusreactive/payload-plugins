import { cache } from "react";

import { NEWS_CONFIG } from "@/lib/config/news";
import type { Locale } from "@/lib/types";
import { cacheTag } from "@/lib/utils/cacheTags";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import { scopedCache } from "@/lib/utils/scopedCache";

import { getPayloadClient } from "./payload-client";

async function query(locale: Locale) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: NEWS_CONFIG.collection,
    depth: 0,
    locale,
    overrideAccess: true,
    pagination: false,
    select: { excerpt: true, publishedAt: true, slug: true, title: true },
    sort: "-publishedAt",
    where: { _status: { equals: "published" } },
  });
  return docs;
}

/** Every published press release, newest first (/news.html). */
export const getAllNews = cache(async ({ locale }: { locale?: Locale } = {}) => {
  const resolvedLocale = await resolveLocale(locale);
  return scopedCache(() => query(resolvedLocale), ["allNews", resolvedLocale], {
    tags: [cacheTag({ locale: resolvedLocale, type: "newsList" })],
  })();
});
