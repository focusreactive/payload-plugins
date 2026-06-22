import type { CtaBandBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractCtaBandText(block: CtaBandBlock): string {
  return joinText([block.eyebrow, block.heading, block.description]);
}
