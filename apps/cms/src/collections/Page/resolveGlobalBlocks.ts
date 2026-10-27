import type { PayloadRequest } from "payload";

import { collectGlobalBlockIds, isPublishedGlobalBlock } from "@/collections/GlobalBlock/slots";
import { relationId } from "@/lib/contentExtraction";
import type { Locale } from "@/lib/types";
import type { Page } from "@/payload-types";

export async function resolveGlobalBlocks<T extends Pick<Page, "blocks">>({
  locale,
  page,
  req,
}: {
  locale: Locale;
  page: T;
  req: PayloadRequest;
}): Promise<T> {
  const blocks = page.blocks ?? [];
  const ids = collectGlobalBlockIds(blocks);

  if (ids.length === 0) {
    return page;
  }

  const { docs } = await req.payload.find({
    collection: "globalBlock",
    depth: 0,
    locale,
    overrideAccess: true,
    pagination: false,
    req,
    where: { id: { in: ids } },
  });
  const publishedById = new Map(
    docs.filter(isPublishedGlobalBlock).map((doc) => [String(doc.id), doc])
  );

  return {
    ...page,
    blocks: blocks.map((block) => {
      if (block.blockType !== "globalSectionSlot") return block;

      const id = relationId(block.reference);
      const published = id == null ? undefined : publishedById.get(String(id));

      return published ? { ...block, reference: published } : block;
    }),
  };
}
