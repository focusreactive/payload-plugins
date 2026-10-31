import { joinText, sectionHeadingText } from "@/lib/utils/text";
import type { HeroBlock } from "@/payload-types";

export function extractHeroText(block: HeroBlock): string {
  return joinText([
    ...sectionHeadingText(block.heading),
    ...(block.actions?.map((action) => action.label) ?? []),
  ]);
}
