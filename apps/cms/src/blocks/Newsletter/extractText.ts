import type { NewsletterBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractNewsletterText(block: NewsletterBlock): string {
  return joinText([block.eyebrow, block.heading, block.disclaimer]);
}
