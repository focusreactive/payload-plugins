import { draftMode } from "next/headers";
import type { Payload, RequiredDataFromCollectionSlug } from "payload";
import { cache } from "react";

import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";

import { getAllDocuments } from "./getAllDocuments";

// Depth pages are rendered at. Shared so a global block embedded through `globalSectionSlot` can be
// re-populated at the same depth, giving its inner blocks the same relationship population as page blocks.
export const PAGE_RENDER_DEPTH = 3;

export async function getPageBySlugQuery(
  payload: Payload,
  pathSegmentsNorm: string[],
  resolvedLocale: Locale,
  draft: boolean
): Promise<RequiredDataFromCollectionSlug<"page"> | null> {
  const targetUrl = `/${pathSegmentsNorm.join("/")}`;
  const lastSegment = pathSegmentsNorm.at(-1)!;

  const docs = await getAllDocuments(payload, "page", {
    depth: PAGE_RENDER_DEPTH,
    draft,
    locale: resolvedLocale,
    overrideAccess: true,
    where: {
      slug: { equals: lastSegment },
      ...(!draft && {
        _status: { equals: "published" },
      }),
    },
  });

  return docs.find((p) => p?.breadcrumbs?.at(-1)?.url === targetUrl) ?? null;
}

export const getPageBySlug = cache(
  async (
    pathSegments: string[],
    locale?: Locale
  ): Promise<RequiredDataFromCollectionSlug<"page"> | null> => {
    const { isEnabled: draft } = await draftMode();
    const resolvedLocale = await resolveLocale(locale);
    const pathSegmentsNorm = pathSegments.length === 0 ? ["home"] : [...pathSegments];
    const pathKey = pathSegmentsNorm.join("/");
    const payload = await getPayloadClient();

    if (draft) {
      return getPageBySlugQuery(payload, pathSegmentsNorm, resolvedLocale, true);
    }

    const res = cacheTag({
      locale: resolvedLocale,
      path: pathKey,
      type: "page",
    });

    return scopedCache(
      () => getPageBySlugQuery(payload, pathSegmentsNorm, resolvedLocale, false),
      [pathKey, resolvedLocale],
      {
        tags: [res],
      }
    )();
  }
);
