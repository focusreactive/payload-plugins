import { extractLexicalText, joinText } from "@/core/utils/text";
import type { FaqBlock } from "@/payload-types";

export function extractFaqText(block: FaqBlock): string {
  return joinText([block.eyebrow, block.heading, block.lead, ...(block.items ?? []).flatMap((item) => [item.question, extractLexicalText(item.answer)])]);
}
