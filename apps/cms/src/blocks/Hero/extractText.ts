import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { HeroBlock } from "@/payload-types";

export function extractHeroText(block: HeroBlock): string {
  return joinText([
    block.eyebrow,
    block.title,
    extractLexicalText(block.richText),
    ...(block.actions?.map((action) => action.label) ?? []),
  ]);
}
