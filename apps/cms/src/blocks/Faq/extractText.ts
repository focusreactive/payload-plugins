import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { FaqBlock } from "@/payload-types";

export function extractFaqText(block: FaqBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.description,
    ...(block.items ?? []).flatMap((item) => [item.question, extractLexicalText(item.answer)]),
  ]);
}
