import type { CtaBandBlock } from "@/payload-types";
import { joinText, sectionHeadingText } from "@/lib/utils/text";

export function extractCtaBandText(block: CtaBandBlock): string {
  return joinText(sectionHeadingText(block.heading));
}
