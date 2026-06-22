import { describe, expect, it } from "vitest";
import { getRecommendation } from "../../src/engine/recommendations";

describe("getRecommendation", () => {
  it("returns undefined for good status", () => {
    expect(getRecommendation("keyphraseDensity", "good", {})).toBeUndefined();
  });

  it("returns mapped copy for a known id + bad status", () => {
    expect(
      getRecommendation("introductionKeyword", "bad", { keyphrase: "best running shoes" })
    ).toContain("best running shoes");
  });

  it("falls back to a generic message for unmapped ids", () => {
    expect(getRecommendation("somethingNew", "warn", {})).toBeTruthy();
  });
});
