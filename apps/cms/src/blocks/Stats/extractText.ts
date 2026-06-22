import type { StatsBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractStatsText(block: StatsBlock): string {
  return joinText((block.items ?? []).flatMap((item) => [item.value, item.label]));
}
