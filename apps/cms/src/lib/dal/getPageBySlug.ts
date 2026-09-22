import { draftMode } from "next/headers";
import type { Payload, RequiredDataFromCollectionSlug } from "payload";
import { cache } from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";

import { getAllDocuments } from "./getAllDocuments";
import { getPathMap } from "./pathMap";

/**
 * Draft preview has to see an unpublished rename immediately, and the path
 * map only ever reflects published documents (see `pathMap.ts`), so preview
 * cannot resolve through it. It falls back to the pre-map approach: query by
 * last segment, then confirm the full path in JavaScript. This was never the
 * part that was broken - the caching layer around the published path was.
 */
async function getDraftPageByPath(
  payload: Payload,
  pathSegmentsNorm: string[],
  resolvedLocale: Locale
): Promise<RequiredDataFromCollectionSlug<"page"> | null> {
  const targetUrl = `/${pathSegmentsNorm.join("/")}`;
  const lastSegment = pathSegmentsNorm.at(-1)!;

  const docs = await getAllDocuments(payload, "page", {
    depth: 3,
    draft: true,
    locale: resolvedLocale,
    overrideAccess: true,
    where: {
      slug: { equals: lastSegment },
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
    const payload = await getPayloadClient();

    if (draft) {
      return getDraftPageByPath(payload, pathSegmentsNorm, resolvedLocale);
    }

    // The map is keyed by id, which a rename never changes, so there is no
    // per-path cache entry left to go stale the way the old
    // `page_<path>_<locale>` tag did - see pathMap.ts's file header.
    const pathMap = await getPathMap();
    const targetUrl = `/${pathSegmentsNorm.join("/")}`;
    const id = pathMap.pathToId[resolvedLocale]?.[targetUrl];

    if (id === undefined) {
      return null;
    }

    return payload.findByID({
      id,
      collection: "page",
      depth: 3,
      draft: false,
      locale: resolvedLocale,
      overrideAccess: true,
    }) as Promise<RequiredDataFromCollectionSlug<"page"> | null>;
  }
);
