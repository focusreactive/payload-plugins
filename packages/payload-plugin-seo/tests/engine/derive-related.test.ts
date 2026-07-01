import { describe, expect, it, vi } from "vitest";
import { deriveRelatedKeyphrase } from "../../src/engine/runAnalysis/services/derive-related";

vi.mock("yoastseo/build/scoring/assessors/relatedKeywordAssessor", () => ({
  default: function () {
    return {
      assess: () => undefined,
      getValidResults: () => [
        { getIdentifier: () => "introductionKeyword", score: 9 },
        { getIdentifier: () => "keywordDensity", score: 3 },
      ],
    };
  },
}));
vi.mock("yoastseo/build/languageProcessing/languages/en/Researcher", () => ({
  default: function () {
    return {
      getResearch: () => {
        throw new Error("no research in test");
      },
    };
  },
}));

describe("deriveRelatedKeyphrase", () => {
  it("returns a CategoryResult built from the RelatedKeywordAssessor results", () => {
    const paper = { getKeyword: () => "headless cms" } as never;
    const cat = deriveRelatedKeyphrase(paper, "headless cms");
    expect(cat.checks.map((c) => c.id)).toEqual(["introductionKeyword", "keywordDensity"]);
    expect(typeof cat.ringScore).toBe("number");
    expect(["good", "warn", "bad"]).toContain(cat.status);
    // enrich attaches data to every check
    for (const c of cat.checks) expect(Object.hasOwn(c, "data")).toBe(true);
  });
});
