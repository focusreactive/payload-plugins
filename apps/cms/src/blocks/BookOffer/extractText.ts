import type { BookOfferBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractBookOfferText(block: BookOfferBlock): string {
  return joinText([block.eyebrow, block.heading, block.description, block.submitLabel]);
}
