import type { PagesAnalyticsConfig, PagesCollectionConfig } from "../types/config";
import { DEFAULT_PAGE_DIMENSIONS } from "../constants/page";

export interface ResolvedPagesConfig {
  collections: Required<PagesCollectionConfig>[];
  syntheticRefs: string[];
  dimensions: { pageRef: string; contentLocale: string };
}

export function resolvePagesConfig(pages: PagesAnalyticsConfig | undefined): ResolvedPagesConfig | null {
  if (!pages) return null;

  return {
    collections: pages.collections.map((c) => (typeof c === "string" ? { slug: c, publishedOnly: true } : { slug: c.slug, publishedOnly: c.publishedOnly ?? true })),
    syntheticRefs: pages.syntheticRefs ?? [],
    dimensions: {
      pageRef: pages.dimensions?.pageRef ?? DEFAULT_PAGE_DIMENSIONS.pageRef,
      contentLocale: pages.dimensions?.contentLocale ?? DEFAULT_PAGE_DIMENSIONS.contentLocale,
    },
  };
}
