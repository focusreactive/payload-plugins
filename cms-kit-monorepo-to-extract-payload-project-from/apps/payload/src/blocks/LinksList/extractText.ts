import { joinText } from "@/core/utils/text";
import type { LinksListBlock } from "@/payload-types";

export function extractLinksListText(block: LinksListBlock): string {
  return joinText((block.links ?? []).map((item) => item.link?.label));
}
