import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import type { RequiredDataFromCollectionSlug } from "payload";
import { cache } from "react";

import { cacheTag } from "@/core/lib/cacheTags";
import { resolveLocale } from "@/core/lib/resolveLocale";
import type { Locale } from "@/core/types";
import { getPayloadClient } from "@/dal/payload-client";

import { getAllDocuments } from "./getAllDocuments";

async function getPageBySlugQuery(
  pathSegmentsNorm: string[],
  resolvedLocale: Locale,
  draft: boolean
): Promise<RequiredDataFromCollectionSlug<"page"> | null> {
  const fullPath = pathSegmentsNorm.join("/");
  const targetUrl = `/${fullPath}`;
  const payload = await getPayloadClient();

  const result = await getAllDocuments(payload, "page", {
    depth: 4,
    draft,
    locale: resolvedLocale,
    overrideAccess: true,
    where: {
      ...(!draft && {
        _status: { equals: "published" },
      }),
    },
  });

  const doc = result.find(
    (p) => p?.breadcrumbs?.length && p.breadcrumbs.at(-1)?.url === targetUrl
  );

  return doc ?? null;
}

export const getPageBySlug = cache(
  async (
    pathSegments: string[],
    locale?: Locale
  ): Promise<RequiredDataFromCollectionSlug<"page"> | null> => {
    const { isEnabled: draft } = await draftMode();
    const resolvedLocale = await resolveLocale(locale);
    const pathSegmentsNorm =
      pathSegments.length === 0 ? ["home"] : [...pathSegments];
    const pathKey = pathSegmentsNorm.join("/");

    if (draft) {
      return getPageBySlugQuery(pathSegmentsNorm, resolvedLocale, draft);
    }

    const res = cacheTag({
      locale: resolvedLocale,
      path: pathKey,
      type: "page",
    });

    return unstable_cache(
      () => getPageBySlugQuery(pathSegmentsNorm, resolvedLocale, false),
      [pathKey, resolvedLocale],
      {
        tags: [res],
      }
    )();
  }
);
