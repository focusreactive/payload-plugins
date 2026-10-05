import { markdownToPlainText } from "@/lib/markdown/plainText";
import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { Post } from "@/payload-types";

export function extractPostText(
  post: Pick<Post, "title" | "excerpt" | "content" | "faq" | "cta"> &
    Partial<Pick<Post, "markdown">>
): string {
  const faqItemsText = (post.faq?.items ?? []).flatMap((item) => [
    item.question,
    extractLexicalText(item.answer),
  ]);

  return joinText([
    post.title,
    post.excerpt,
    extractLexicalText(post.content),
    markdownToPlainText(post.markdown),
    post.faq?.heading,
    ...faqItemsText,
    post.cta?.eyebrow,
    post.cta?.heading,
    post.cta?.description,
  ]);
}
