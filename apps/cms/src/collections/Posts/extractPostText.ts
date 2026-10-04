import { markdownToPlainText } from "@/lib/markdown/plainText";
import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { Post } from "@/payload-types";

export function extractPostText(
  post: Pick<Post, "title" | "excerpt" | "content" | "faq" | "cta"> &
    Partial<Pick<Post, "contentFormat" | "markdown">>
): string {
  const faqItemsText = (post.faq?.items ?? []).flatMap((item) => [
    item.question,
    extractLexicalText(item.answer),
  ]);

  return joinText([
    post.title,
    post.excerpt,
    post.contentFormat === "markdown"
      ? markdownToPlainText(post.markdown)
      : extractLexicalText(post.content),
    post.faq?.heading,
    ...faqItemsText,
    post.cta?.eyebrow,
    post.cta?.heading,
    post.cta?.description,
  ]);
}
