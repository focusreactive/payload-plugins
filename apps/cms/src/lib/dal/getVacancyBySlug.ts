import { draftMode } from "next/headers";
import { cache } from "react";

import { CAREERS_CONFIG } from "@/lib/config/careers";
import type { Locale } from "@/lib/types";
import { cacheTag } from "@/lib/utils/cacheTags";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import { scopedCache } from "@/lib/utils/scopedCache";
import type { Vacancy } from "@/payload-types";

import { getPayloadClient } from "./payload-client";

async function getVacancyBySlugQuery(
  slug: string,
  locale: Locale,
  draft: boolean
): Promise<Vacancy | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: CAREERS_CONFIG.collection,
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

export const getVacancyBySlug = cache(
  async ({ slug, locale }: { slug: string; locale?: Locale }): Promise<Vacancy | null> => {
    const { isEnabled: draft } = await draftMode();
    const resolvedLocale = await resolveLocale(locale);

    if (draft) {
      return getVacancyBySlugQuery(slug, resolvedLocale, true);
    }

    return scopedCache(
      () => getVacancyBySlugQuery(slug, resolvedLocale, false),
      ["vacancy", slug, resolvedLocale],
      { tags: [cacheTag({ locale: resolvedLocale, slug, type: "vacancy" })] }
    )();
  }
);
