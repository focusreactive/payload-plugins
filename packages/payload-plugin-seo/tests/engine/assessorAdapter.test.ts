import { describe, expect, it } from "vitest";
import { runAssessor } from "../../src/engine/assessorAdapter";

const result = (id: string, score: number) => ({
  getIdentifier: () => id,
  score,
});

describe("runAssessor", () => {
  it("normalizes valid results into CheckResult[] with status + recommendation", () => {
    const assessor = {
      assess() {},
      getValidResults: () => [result("introductionKeyword", 3), result("textLength", 9)],
    };
    const checks = runAssessor(assessor, { keyphrase: "running shoes" });
    expect(checks).toEqual([
      {
        id: "introductionKeyword",
        score: 3,
        status: "bad",
        recommendation: {
          key: "reco.introductionKeyword.bad",
          vars: { keyphrase: "running shoes" },
        },
        data: undefined,
      },
      {
        id: "textLength",
        score: 9,
        status: "good",
        recommendation: undefined,
        data: undefined,
      },
    ]);
  });
});
