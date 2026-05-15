import { extractLexicalText, joinText } from "@/core/utils/text";
import type { CarouselBlock } from "@/payload-types";

export function extractCarouselText(block: CarouselBlock): string {
  return joinText([
    extractLexicalText(block.text),
    ...(block.slides ?? []).map((slide) => extractLexicalText(slide.text)),
  ]);
}
