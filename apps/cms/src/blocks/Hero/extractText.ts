import { extractLexicalText, joinText } from "@/core/utils/text";
import type { HeroBlock } from "@/payload-types";

export function extractHeroText(block: HeroBlock): string {
  return joinText([
    block.title,
    extractLexicalText(block.richText),
    ...(block.actions?.map((action) => action.label) ?? []),
  ]);
}
