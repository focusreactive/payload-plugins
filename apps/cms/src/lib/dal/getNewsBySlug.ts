import { draftMode } from "next/headers";
import { cache } from "react";

import { NEWS_CONFIG } from "@/lib/config/news";
import type { Locale } from "@/lib/types";
import { cacheTag } from "@/lib/utils/cacheTags";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import { scopedCache } from "@/lib/utils/scopedCache";
import type { News } from "@/payload-types";

import { getPayloadClient } from "./payload-client";

async function getNewsBySlugQuery(
  slug: string,
  locale: Locale,
  draft: boolean
): Promise<News | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: NEWS_CONFIG.collection,
    depth: 1,
    draft,
    limit: 1,
    locale,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: { equals: slug },
      ...(!draft && { _status: { equals: "published" } }),
    },
  });
  return docs[0] ?? null;
}

export const getNewsBySlug = cache(
  async ({ slug, locale }: { slug: string; locale?: Locale }): Promise<News | null> => {
    const { isEnabled: draft } = await draftMode();
    const resolvedLocale = await resolveLocale(locale);

    if (draft) {
      return getNewsBySlugQuery(slug, resolvedLocale, true);
    }

    return scopedCache(
      () => getNewsBySlugQuery(slug, resolvedLocale, false),
      ["news", slug, resolvedLocale],
      { tags: [cacheTag({ locale: resolvedLocale, slug, type: "newsItem" })] }
    )();
  }
);
