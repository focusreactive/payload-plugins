import type { PayloadRequest } from "payload";

import type { Locale } from "@/lib/types";
import type { Page } from "@/payload-types";

type Slot = Extract<Page["blocks"][number], { blockType: "globalSectionSlot" }>;

const slotId = (slot: Slot) =>
  typeof slot.reference === "object" ? slot.reference.id : slot.reference;

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
  const ids = blocks.flatMap((b) => (b.blockType === "globalSectionSlot" ? [slotId(b)] : []));

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
    where: { _status: { equals: "published" }, id: { in: ids } },
  });
  const published = new Map(docs.map((d) => [d.id, d]));

  return {
    ...page,
    blocks: blocks.map((b) =>
      b.blockType === "globalSectionSlot"
        ? { ...b, reference: published.get(slotId(b)) ?? slotId(b) }
        : b
    ),
  };
}
