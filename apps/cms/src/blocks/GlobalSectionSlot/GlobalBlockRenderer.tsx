import { draftMode } from "next/headers";

import { renderContentBlock } from "@/blocks/contentBlockComponents";
import { isPublishedGlobalBlock } from "@/collections/GlobalBlock/slots";
import { getPayloadClient, PAGE_RENDER_DEPTH } from "@/dal";
import { filterHiddenBlocks } from "@/lib/fields/section/filterHiddenBlocks";
import type { Locale } from "@/lib/types";
import { resolveLocale } from "@/lib/utils/resolveLocale";

// Re-fetched because the page query spends one depth level on the slot, and inner blocks need the full depth.
// `editable` marks the block for visual editing; only its own preview sets it, so on a page the
// shared block stays clean and only the page's own fields are editable.
export const GlobalBlockRenderer = async ({
  editable = false,
  locale,
  referenceId,
}: {
  editable?: boolean;
  locale?: Locale;
  referenceId: number;
}) => {
  const { isEnabled: draft } = await draftMode();
  const resolvedLocale = await resolveLocale(locale);
  const payload = await getPayloadClient();

  const globalBlock = await payload.findByID({
    collection: "globalBlock",
    context: { visualEditing: draft && editable },
    depth: PAGE_RENDER_DEPTH,
    disableErrors: true,
    draft,
    id: referenceId,
    locale: resolvedLocale,
    overrideAccess: true,
  });

  if (!globalBlock) return null;
  if (!draft && !isPublishedGlobalBlock(globalBlock)) return null;

  const [inner] = filterHiddenBlocks(globalBlock.block);
  if (!inner) return null;

  return renderContentBlock(inner, inner.id ?? "global-section-inner");
};
