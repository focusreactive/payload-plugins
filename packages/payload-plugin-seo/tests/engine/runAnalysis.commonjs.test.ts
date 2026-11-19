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

vi.mock(
  "yoastseo/build/languageProcessing/researches/keyphraseDistribution",
  async (importOriginal) => ({ default: await importOriginal() })
);

vi.mock("yoastseo/build/scoring/assessors/relatedKeywordAssessor", async (importOriginal) => ({
  default: await importOriginal(),
}));

vi.mock(
  "yoastseo/build/scoring/assessments/seo/KeyphraseLengthAssessment",
  async (importOriginal) => ({
    default: await importOriginal(),
  })
);

vi.mock(
  "yoastseo/build/scoring/assessments/seo/KeywordDensityAssessment",
  async (importOriginal) => ({
    default: await importOriginal(),
  })
);

vi.mock(
  "yoastseo/build/scoring/assessments/seo/MetaDescriptionLengthAssessment",
  async (importOriginal) => ({
    default: await importOriginal(),
  })
);

vi.mock(
  "yoastseo/build/scoring/assessments/seo/PageTitleWidthAssessment",
  async (importOriginal) => ({
    default: await importOriginal(),
  })
);

vi.mock("yoastseo/build/scoring/assessments/seo/TextLengthAssessment", async (importOriginal) => ({
  default: await importOriginal(),
}));

vi.mock(
  "yoastseo/build/scoring/assessments/readability/SentenceLengthInTextAssessment",
  async (importOriginal) => ({
    default: await importOriginal(),
  })
);

vi.mock(
  "yoastseo/build/languageProcessing/languages/ja/config/metaDescriptionLength",
  async (importOriginal) => ({
    default: await importOriginal(),
  })
);

vi.mock("yoastseo/build/helpers/formatNumber", async (importOriginal) => ({
  default: await importOriginal(),
}));

vi.mock(
  "yoastseo/build/scoring/helpers/assessments/keyphraseLengthFactor",
  async (importOriginal) => ({
    default: await importOriginal(),
  })
);

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

  it("analyses with configured thresholds", () => {
    const result = runAnalysis(input, {
      keyphraseDensity: { min: 1, max: 2 },
      metaDescriptionLength: { min: 100, max: 140 },
      titleWidth: { max: 500 },
      textLength: { min: 400 },
      keyphraseLength: { max: 3 },
      textSentenceLength: { maxSentenceWords: 15 },
    });

    expect(result.onPage.checks.length).toBeGreaterThan(0);
    expect(typeof result.overall.seoScore).toBe("number");
  });

  it("analyses Japanese text", () => {
    const result = runAnalysis({ ...input, locale: "ja" });

    expect(typeof result.overall.seoScore).toBe("number");
  });
});
