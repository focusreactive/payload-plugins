import { describe, expect, it } from "vitest";
import { buildIssues } from "../../src/components/SeoDrawer/overview/buildIssues";
import type { AnalysisResult, CheckResult } from "../../src/engine/types/analysis";

const check = (id: string, status: CheckResult["status"], score: number): CheckResult => ({
  id,
  status,
  score,
});

const category = (checks: CheckResult[]) => ({ ringScore: 50, status: "warn" as const, checks });

const result = (keyphraseText: string): AnalysisResult =>
  ({
    overall: { seoScore: 50, status: "warn" },
    keyphraseText,
    keyphrase: category([check("keyphraseDensity", "bad", -10), check("slugKeyword", "good", 9)]),
    relatedKeyphrases: [],
    onPage: category([check("textLength", "warn", 6), check("internalLinks", "bad", 3)]),
    readability: category([check("passiveVoice", "good", 9)]),
    inclusive: {
      ringScore: 90,
      status: "warn",
      categories: [
        { id: "age", flags: [{ term: "elderly", suggestion: "older people", location: "p1" }] },
      ],
      cleanCategories: [],
    },
  }) as unknown as AnalysisResult;

describe("buildIssues", () => {
  it("lists problems before improvements across categories, worst score first", () => {
    const { open } = buildIssues(result("crm"));

    expect(open.map((i) => i.key)).toEqual([
      "keyphrase:keyphraseDensity",
      "onpage:internalLinks",
      "onpage:textLength",
      "inclusive:age:0",
    ]);
  });

  it("leaves keyphrase checks out and marks the category unavailable without a keyphrase", () => {
    const { open, passed, categories } = buildIssues(result(""));

    expect(open.some((i) => i.category === "keyphrase")).toBe(false);
    expect(passed.some((i) => i.category === "keyphrase")).toBe(false);
    expect(categories.find((c) => c.category === "keyphrase")?.available).toBe(false);
  });

  it("counts open issues per category", () => {
    const { categories } = buildIssues(result("crm"));

    expect(categories.find((c) => c.category === "onpage")?.open).toBe(2);
  });
});
