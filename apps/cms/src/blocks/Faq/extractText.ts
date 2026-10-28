import { extractLexicalText, joinText, sectionHeadingText } from "@/lib/utils/text";
import type { FaqBlock } from "@/payload-types";

export function extractFaqText(block: FaqBlock): string {
  return joinText([
    ...sectionHeadingText(block.heading),
    ...(block.items ?? []).flatMap((item) => [item.question, extractLexicalText(item.answer)]),
  ]);
}
