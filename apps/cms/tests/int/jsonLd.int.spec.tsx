import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JsonLd } from "@/components/seo/components/JsonLd";
import { createFaqSchema } from "@/components/seo/schemas/faqSchema";
import type { FaqBlock } from "@/payload-types";

import { markedField, markedNode, paragraphsOf } from "../support/markers";

const faq = (question: string, answerText: string): FaqBlock => ({
  blockType: "faq",
  items: [{ answer: paragraphsOf([answerText]), question }],
});

const jsonLdOf = (data: Record<string, unknown>) => {
  const page = document.createElement("div");
  page.innerHTML = renderToStaticMarkup(<JsonLd data={data} />);
  return JSON.parse(page.querySelector("script")?.textContent ?? "null");
};

const articleSchema = (title: string) => ({
  "@type": "BlogPosting",
  author: [{ "@type": "Person", name: "Ada" }],
  headline: title,
  itemListElement: [{ name: title, position: 1 }],
});

describe("JSON-LD of a draft read", () => {
  it("states the questions and answers of a FAQ without markers", () => {
    const stored = createFaqSchema(faq("Is it live?", "Yes, as you type."));
    const draftRead = createFaqSchema(
      faq(markedField("Is it live?", "layout.0.items.0.question"), markedNode("Yes, as you type."))
    );

    expect(jsonLdOf(draftRead as Record<string, unknown>)).toEqual(stored);
  });

  it("states every text of a schema without markers", () => {
    expect(jsonLdOf(articleSchema(markedField("Hello", "title")))).toEqual(articleSchema("Hello"));
  });
});
