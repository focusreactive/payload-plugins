import { describe, expect, it, vi } from "vitest";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput } from "../../src/engine/types/analysis";

vi.mock("yoastseo/build/languageProcessing/languages/en/Researcher", async (importOriginal) => ({
  default: await importOriginal(),
}));

vi.mock(
  "yoastseo/build/scoring/assessments/seo/KeyphraseDistributionAssessment",
  async (importOriginal) => ({ default: await importOriginal() })
);

vi.mock("yoastseo/build/scoring/assessors/relatedKeywordAssessor", async (importOriginal) => ({
  default: await importOriginal(),
}));

const input: AnalysisInput = {
  title: "Best Running Shoes",
  slug: "running-shoes",
  description: "Discover the best running shoes for every runner.",
  contentHtml:
    "<h2>Running shoes</h2><p>Running shoes protect your feet. Choose running shoes that fit well.</p>",
  keyphrase: "running shoes",
  keyphrases: [
    { text: "running shoes", synonyms: [] },
    { text: "trail shoes", synonyms: [] },
  ],
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

describe("runAnalysis when yoastseo build modules arrive as CommonJS module objects", () => {
  it("analyses with the real Yoast researcher and assessors", () => {
    const result = runAnalysis(input);

    expect(result.keyphrase.checks.map((check) => check.id)).toContain("keyphraseDistribution");
    expect(result.onPage.checks.length).toBeGreaterThan(0);
    expect(typeof result.overall.seoScore).toBe("number");
  });
});
