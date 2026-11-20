import { extractPageBlockText } from "@/collections/Page/extractPageText";
import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { Post } from "@/payload-types";

export function extractPostText(
  post: Pick<Post, "title" | "excerpt" | "content" | "blocks">
): string {
  return joinText([
    post.title,
    post.excerpt,
    extractLexicalText(post.content),
    // Posts offer the page section library, so they share its per-block extractors.
    ...(post.blocks ?? []).map(extractPageBlockText),
  ]);
}
