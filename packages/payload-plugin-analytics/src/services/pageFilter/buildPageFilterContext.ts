import type { Payload } from "payload";
import type { ResolvedPagesConfig } from "../../config/resolvePagesConfig";
import type { PageFilterContext } from "./types";
import { getExistingPageRefs } from "./getExistingPageRefs";
import { getCachedExistingRefs } from "./existingRefsCache";

export async function buildPageFilterContext(payload: Payload, config: ResolvedPagesConfig | null): Promise<PageFilterContext | null> {
  if (!config) return null;

  const key = config.collections.map(({ slug, publishedOnly }) => `${slug}:${publishedOnly}`).join(",") + "|" + config.syntheticRefs.join(",");

  const refs = await getCachedExistingRefs(key, () => getExistingPageRefs(payload, config));

  return {
    refs: [...refs],
    pageRefDim: config.dimensions.pageRef,
    contentLocaleDim: config.dimensions.contentLocale,
  };
}
