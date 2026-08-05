import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import type { Payload, RequiredDataFromCollectionSlug } from "payload";
import { cache } from "react";

import { cacheTag } from "@/lib/utils/cacheTags";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";

async function getGeneratedPageBySlugQuery(
  payload: Payload,
  slug: string,
  resolvedLocale: Locale,
  draft: boolean
): Promise<RequiredDataFromCollectionSlug<"generated-pages"> | null> {
  const result = await payload.find({
    collection: "generated-pages",
    depth: 3,
    draft,
    limit: 1,
    locale: resolvedLocale,
    overrideAccess: true,
    where: {
      slug: { equals: slug },
      ...(!draft && {
        _status: { equals: "published" },
      }),
    },
  });

  return result.docs[0] ?? null;
}

export const getGeneratedPageBySlug = cache(
  async (
    slug: string,
    locale?: Locale
  ): Promise<RequiredDataFromCollectionSlug<"generated-pages"> | null> => {
    const { isEnabled: draft } = await draftMode();
    const resolvedLocale = await resolveLocale(locale);
    const payload = await getPayloadClient();

    if (draft) {
      return getGeneratedPageBySlugQuery(payload, slug, resolvedLocale, true);
    }

    return unstable_cache(
      () => getGeneratedPageBySlugQuery(payload, slug, resolvedLocale, false),
      [slug, resolvedLocale],
      {
        tags: [cacheTag({ locale: resolvedLocale, slug, type: "generatedPage" })],
      }
    )();
  }
);
