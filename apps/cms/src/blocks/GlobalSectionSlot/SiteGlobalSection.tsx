import { draftMode } from "next/headers";

import { RenderSiteBlock, isSiteBlock } from "@/blocks/siteBlockComponents";
import type { SiteBlockContext, SiteBlockProps } from "@/blocks/site/types";
import { isPublishedGlobalBlock } from "@/collections/GlobalBlock/slots";
import { getPayloadClient, PAGE_RENDER_DEPTH } from "@/dal";
import { filterHiddenBlocks } from "@/lib/fields/section/filterHiddenBlocks";
import type { Locale } from "@/lib/types";
import type { GlobalBlock, GlobalSectionSlotBlock } from "@/payload-types";

interface ContentProps {
  globalBlock: GlobalBlock;
  locale: Locale;
  context?: SiteBlockContext;
}

/** A global section's own block, through the same renderer as a section placed inline. */
export function SiteGlobalSectionContent({ globalBlock, locale, context }: ContentProps) {
  const [inner] = filterHiddenBlocks(globalBlock.block);

  if (!inner || !isSiteBlock(inner.blockType)) {
    return null;
  }

  return <RenderSiteBlock block={inner} context={context} locale={locale} />;
}

// Re-read because the page query spends one depth level on the slot, and the inner block needs the full depth.
export async function SiteGlobalSection({
  reference,
  locale,
  context,
}: SiteBlockProps<GlobalSectionSlotBlock>) {
  const id = typeof reference === "object" && reference ? reference.id : reference;

  if (id == null) {
    return null;
  }

  const { isEnabled: draft } = await draftMode();
  const payload = await getPayloadClient();
  const globalBlock = await payload.findByID({
    collection: "globalBlock",
    context: { visualEditing: draft },
    depth: PAGE_RENDER_DEPTH,
    disableErrors: true,
    draft,
    id,
    locale,
    overrideAccess: true,
  });

  if (!globalBlock || (!draft && !isPublishedGlobalBlock(globalBlock))) {
    return null;
  }

  return <SiteGlobalSectionContent context={context} globalBlock={globalBlock} locale={locale} />;
}
