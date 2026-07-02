import { describe, expect, it, vi } from "vitest";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput } from "../../src/engine/types/analysis";

// Reconciled against the installed yoastseo@3.6.0 (Task 0.4): export names are
// `SeoAssessor` / `ContentAssessor`, and the inclusive assessor lives on the
// `assessors` namespace. The (English) researcher is a deep default export and
// is mocked separately — `vi.mock("yoastseo")` does not cover that subpath, and
// the real module loads `yoastseo`'s languageProcessing at import time.
vi.mock("yoastseo", () => {
  const res = (id: string, score: number) => ({ getIdentifier: () => id, score });
  const assessorReturning = (results: ReturnType<typeof res>[]) =>
    function FakeAssessor() {
      return {
        assess: () => undefined,
        getValidResults: () => results,
        addAssessment: () => undefined,
      };
    };
  return {
    Paper: function (text: string, attributes: Record<string, unknown>) {
      return { text, attributes };
    },
    SeoAssessor: assessorReturning([res("introductionKeyword", 3), res("textLength", 9)]),
    ContentAssessor: assessorReturning([res("textParagraphTooLong", 6)]),
    assessors: { InclusiveLanguageAssessor: assessorReturning([]) },
  };
});

vi.mock("yoastseo/build/languageProcessing/languages/en/Researcher", () => ({
  default: function () {
    return {
      getResearch: () => {
        throw new Error("no research in test");
      },
    };
  },
}));

vi.mock("yoastseo/build/scoring/assessors/relatedKeywordAssessor", () => ({
  default: function () {
    return {
      assess: () => undefined,
      getValidResults: () => [{ getIdentifier: () => "keywordDensity", score: 6 }],
    };
  },
}));

const input: AnalysisInput = {
  title: "Best Running Shoes",
  slug: "running-shoes",
  description: "Discover the best running shoes.",
  contentHtml: "<p>Running shoes.</p>",
  keyphrase: "running shoes",
  keyphrases: [
    { text: "running shoes", synonyms: ["trainers"] },
    { text: "trail shoes", synonyms: [] },
  ],
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

describe("runAnalysis", () => {
  it("produces overall, keyphrase, on-page, readability, inclusive, vitals, serp", () => {
    const r = runAnalysis(input);
    expect(r.keyphrase.checks.map((c) => c.id)).toContain("introductionKeyword");
    expect(r.onPage.checks.map((c) => c.id)).toContain("textLength");
    expect(r.readability.checks.map((c) => c.id)).toContain("textParagraphTooLong");
    expect(r.inclusive.cleanCategories.length).toBeGreaterThan(0);
    expect(r.serp.url).toBe("https://runshop.com/running-shoes");
    expect(typeof r.overall.seoScore).toBe("number");
  });

  it("attaches a data field to every check via the enrich step", () => {
    const r = runAnalysis(input);
    const all = [...r.keyphrase.checks, ...r.onPage.checks, ...r.readability.checks];
    expect(all.length).toBeGreaterThan(0);
    for (const c of all) {
      expect(Object.hasOwn(c, "data")).toBe(true);
    }
  });

  it("produces one relatedKeyphrases entry per non-empty related keyphrase", () => {
    const r = runAnalysis(input);
    expect(r.relatedKeyphrases).toHaveLength(1);
    expect(r.relatedKeyphrases[0].text).toBe("trail shoes");
    expect(r.relatedKeyphrases[0].result.checks.map((c) => c.id)).toContain("keywordDensity");
  });

  it("skips related keyphrases with empty text", () => {
    const r = runAnalysis({
      ...input,
      keyphrases: [input.keyphrases[0], { text: "  ", synonyms: [] }],
    });
    expect(r.relatedKeyphrases).toHaveLength(0);
  });
});
