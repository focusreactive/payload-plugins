import { extractLexicalText } from "@/lib/utils/text";
import type { Post } from "@/payload-types";

const WORDS_PER_MINUTE = 200;

export function readingTimeMinutes(content: Post["content"]): number {
  const words = extractLexicalText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
