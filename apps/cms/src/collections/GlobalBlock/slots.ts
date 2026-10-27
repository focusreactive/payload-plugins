import { relationId } from "@/lib/contentExtraction";
import type { GlobalBlock } from "@/payload-types";

interface BlockLike {
  blockType: string;
  reference?: unknown;
}

export function collectGlobalBlockIds(blocks: readonly BlockLike[]): (string | number)[] {
  const ids = new Set<string | number>();

  for (const block of blocks) {
    const id = block.blockType === "globalSectionSlot" ? relationId(block.reference) : null;
    if (id != null) ids.add(id);
  }

  return [...ids];
}

export const isPublishedGlobalBlock = (doc: Pick<GlobalBlock, "_status"> | null | undefined) =>
  doc?._status === "published";
