import { draftMode } from "next/headers";

import { renderContentBlock } from "@/blocks/contentBlockComponents";
import { filterHiddenBlocks } from "@/lib/fields/section/filterHiddenBlocks";
import type { GlobalSectionSlotBlock } from "@/payload-types";

export const GlobalSectionSlotBlockComponent = async ({ reference }: GlobalSectionSlotBlock) => {
  if (!reference || typeof reference === "number") return null;

  const { isEnabled: draft } = await draftMode();
  if (!draft && reference._status !== "published") return null;

  const [inner] = filterHiddenBlocks(reference.block);
  if (!inner) return null;

  return renderContentBlock(inner, inner.id ?? "global-section-inner");
};
