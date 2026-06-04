import { describe, expect, it, vi } from "vitest";
import { buildPaper } from "../../src/engine/buildPaper";
import type { AnalysisInput } from "../../src/engine/types";

vi.mock("yoastseo", () => ({
  Paper: class {
    text: string;
    attributes: Record<string, unknown>;
    constructor(text: string, attributes: Record<string, unknown>) {
      this.text = text;
      this.attributes = attributes;
    }
  },
}));

const input: AnalysisInput = {
  title: "Best Running Shoes",
  slug: "best-running-shoes",
  description: "Discover the best running shoes.",
  contentHtml: "<p>Running shoes.</p>",
  keyphrase: "running shoes",
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

describe("buildPaper", () => {
  it("maps analysis input onto Paper text + attributes", () => {
    const paper = buildPaper(input) as unknown as { text: string; attributes: Record<string, unknown> };
    expect(paper.text).toBe("<p>Running shoes.</p>");
    expect(paper.attributes.keyword).toBe("running shoes");
    expect(paper.attributes.title).toBe("Best Running Shoes");
    expect(paper.attributes.description).toBe("Discover the best running shoes.");
    expect(paper.attributes.slug).toBe("best-running-shoes");
    expect(paper.attributes.locale).toBe("en_US");
  });
});
