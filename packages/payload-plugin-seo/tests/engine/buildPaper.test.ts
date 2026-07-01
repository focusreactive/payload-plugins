import { describe, expect, it, vi } from "vitest";
import { buildPaper } from "../../src/engine/buildPaper";
import type { AnalysisInput } from "../../src/engine/types/analysis";

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
  keyphrases: [{ text: "running shoes", synonyms: [] }],
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

describe("buildPaper", () => {
  it("maps analysis input onto Paper text + attributes", () => {
    const paper = buildPaper(input) as unknown as {
      text: string;
      attributes: Record<string, unknown>;
    };
    expect(paper.text).toBe("<p>Running shoes.</p>");
    expect(paper.attributes.keyword).toBe("running shoes");
    expect(paper.attributes.title).toBe("Best Running Shoes");
    expect(paper.attributes.description).toBe("Discover the best running shoes.");
    expect(paper.attributes.slug).toBe("best-running-shoes");
    expect(paper.attributes.locale).toBe("en_US");
  });
});

const base: AnalysisInput = {
  title: "T",
  slug: "s",
  description: "d",
  contentHtml: "<p>x</p>",
  keyphrase: "payload cms",
  keyphrases: [
    { text: "payload cms", synonyms: ["payloadcms", "payload"] },
    { text: "headless cms", synonyms: ["headless"] },
  ],
  locale: "en_EN",
  site: { name: "n", baseUrl: "https://e.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

describe("buildPaper synonyms + keyword override", () => {
  it("uses the focus keyphrase and its synonyms by default", () => {
    const p = buildPaper(base) as unknown as {
      attributes: Record<string, unknown>;
    };
    expect(p.attributes.keyword).toBe("payload cms");
    expect(p.attributes.synonyms).toBe("payloadcms, payload");
  });

  it("uses an explicit keyphrase + synonyms when provided (related pass)", () => {
    const p = buildPaper(base, base.keyphrases[1]) as unknown as {
      attributes: Record<string, unknown>;
    };
    expect(p.attributes.keyword).toBe("headless cms");
    expect(p.attributes.synonyms).toBe("headless");
  });

  it("empty synonyms produce an empty synonyms string", () => {
    const p = buildPaper(base, { text: "x", synonyms: [] }) as unknown as {
      attributes: Record<string, unknown>;
    };
    expect(p.attributes.synonyms).toBe("");
  });
});
