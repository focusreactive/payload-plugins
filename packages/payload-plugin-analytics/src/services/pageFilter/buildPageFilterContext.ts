import type { PayloadRequest } from "payload";
import type { ResolvedPagesConfig } from "../../config/resolvePagesConfig";
import type { PageFilterContext } from "./types";
import { getExistingPageRefs } from "./getExistingPageRefs";
import { getCachedExistingRefs } from "./existingRefsCache";
import { getCachedPageLabels } from "./pageLabelsCache";
import { resolvePageLabels } from "./resolvePageLabels";
import { setActiveExistingRefs } from "./activeRefsHolder";

export async function buildPageFilterContext(
  req: PayloadRequest,
  config: ResolvedPagesConfig | null
): Promise<PageFilterContext | null> {
  if (!config) return null;

  const key =
    config.collections.map((c) => `${c.slug}:${c.publishedOnly}`).join(",") +
    "|" +
    config.syntheticRefs.join(",");
  const refs = await getCachedExistingRefs(key, () => getExistingPageRefs(req.payload, config));
  const refList = [...refs];

  setActiveExistingRefs(refList);

  const resolveLabels = async (wanted: string[]) => {
    const labelKey = key + "|labels:" + [...wanted].sort().join(",");
    return getCachedPageLabels(labelKey, () => resolvePageLabels(req, config, wanted));
  };

  return {
    refs: refList,
    pageRefDim: config.dimensions.pageRef,
    contentLocaleDim: config.dimensions.contentLocale,
    resolveLabels,
  };
}
