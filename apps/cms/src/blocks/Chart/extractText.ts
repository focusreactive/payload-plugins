import type { ChartBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractChartText(block: ChartBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.description,
    block.title,
    block.subtitle,
    ...(block.ranges ?? []).map((range) => range.label),
  ]);
}
