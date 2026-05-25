import { extractLexicalText } from "@/core/utils/text";
import type { FaqBlock } from "@/payload-types";

export function createFaqSchema(faq: FaqBlock) {
  if (!faq.items || faq.items.length === 0) {
    return null;
  }

  const mainEntity = faq.items
    .filter((item) => item.question && item.answer)
    .map((item) => ({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
        text: extractLexicalText(item.answer),
      },
      name: item.question,
    }));

  if (mainEntity.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}
