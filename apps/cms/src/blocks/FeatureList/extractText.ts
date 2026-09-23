import type { FeatureListBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractFeatureListText(block: FeatureListBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.description,
    ...(block.items ?? []).flatMap((item) => [item.title, item.description]),
  ]);
}
