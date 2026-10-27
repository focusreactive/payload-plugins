import { draftMode } from "next/headers";

import { renderContentBlock } from "@/blocks/contentBlockComponents";
import { getPayloadClient, PAGE_RENDER_DEPTH } from "@/dal";
import { filterHiddenBlocks } from "@/lib/fields/section/filterHiddenBlocks";
import type { Locale } from "@/lib/types";
import { resolveLocale } from "@/lib/utils/resolveLocale";

// Loads the referenced global block at the page's render depth and renders its single inner block.
// Re-fetching here (rather than reading the already-populated relationship) spends no page-render
// depth level on the slot, so the inner block's own relationships get the same population depth they
// would as a page block. Shared by the `globalSectionSlot` page block and the standalone preview route.
export const GlobalBlockRenderer = async ({
  locale,
  referenceId,
}: {
  locale?: Locale;
  referenceId: number;
}) => {
  const { isEnabled: draft } = await draftMode();
  const resolvedLocale = await resolveLocale(locale);
  const payload = await getPayloadClient();

  const globalBlock = await payload
    .findByID({
      collection: "globalBlock",
      depth: PAGE_RENDER_DEPTH,
      draft,
      id: referenceId,
      locale: resolvedLocale,
      overrideAccess: true,
    })
    .catch(() => null);

  if (!globalBlock) return null;
  if (!draft && globalBlock._status !== "published") return null;

  const [inner] = filterHiddenBlocks(globalBlock.block);
  if (!inner) return null;

  return renderContentBlock(inner, inner.id ?? "global-section-inner");
};
