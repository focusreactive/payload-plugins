import type { NewsletterBlock } from "@/payload-types";
import { joinText, sectionHeadingText } from "@/lib/utils/text";

export function extractNewsletterText(block: NewsletterBlock): string {
  return joinText([...sectionHeadingText(block.heading), block.disclaimer]);
}
