import { extractLexicalText, joinText } from "@/core/utils/text";
import type { Post } from "@/payload-types";

export function extractPostText(
  post: Pick<Post, "title" | "excerpt" | "content" | "faq" | "cta">
): string {
  const faqItemsText = (post.faq?.items ?? []).flatMap((item) => [
    item.question,
    extractLexicalText(item.answer),
  ]);

  return joinText([
    post.title,
    post.excerpt,
    extractLexicalText(post.content),
    post.faq?.heading,
    ...faqItemsText,
    post.cta?.eyebrow,
    post.cta?.heading,
    post.cta?.description,
  ]);
}
