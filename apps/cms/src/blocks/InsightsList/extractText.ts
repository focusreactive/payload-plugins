import type { InsightsListBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractInsightsListText(block: InsightsListBlock): string {
  return joinText([block.eyebrow, block.heading, block.description]);
}
