import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import type { Payload, RequiredDataFromCollectionSlug } from "payload";
import { cache } from "react";

import { cacheTag } from "@/lib/utils/cacheTags";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";

import { getAllDocuments } from "./getAllDocuments";

export async function getPageBySlugQuery(
  payload: Payload,
  pathSegmentsNorm: string[],
  resolvedLocale: Locale,
  draft: boolean
): Promise<RequiredDataFromCollectionSlug<"page"> | null> {
  const targetUrl = `/${pathSegmentsNorm.join("/")}`;
  const lastSegment = pathSegmentsNorm.at(-1)!;

  const docs = await getAllDocuments(payload, "page", {
    depth: 3,
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

    return unstable_cache(
      () => getPageBySlugQuery(payload, pathSegmentsNorm, resolvedLocale, false),
      [pathKey, resolvedLocale],
      {
        tags: [res],
      }
    )();
  }
);
