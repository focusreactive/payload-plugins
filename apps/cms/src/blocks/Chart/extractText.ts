import type { ChartBlock } from "@/payload-types";
import { joinText, sectionHeadingText } from "@/lib/utils/text";

export function extractChartText(block: ChartBlock): string {
  return joinText([
    ...sectionHeadingText(block.heading),
    block.title,
    block.subtitle,
    ...(block.ranges ?? []).map((range) => range.label),
  ]);
}
