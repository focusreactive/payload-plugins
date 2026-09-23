import type { StatsBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractStatsText(block: StatsBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.description,
    ...(block.items ?? []).flatMap((item) => [item.value, item.label, item.description]),
  ]);
}
