import { describe, expect, it } from "vitest";
import { getRecommendation } from "../../src/engine/recommendations";
import { createTranslator } from "../../src/translations";

const t = createTranslator("en", undefined);

describe("getRecommendation", () => {
  it("returns undefined for good status", () => {
    expect(getRecommendation("keyphraseDensity", "good", {})).toBeUndefined();
  });

  it("returns a message carrying the keyphrase for a known id + bad status", () => {
    const reco = getRecommendation("introductionKeyword", "bad", {
      keyphrase: "best running shoes",
    });
    expect(reco).toEqual({
      key: "reco.introductionKeyword.bad",
      vars: { keyphrase: "best running shoes" },
    });
    expect(reco && t(reco.key, reco.vars)).toContain("best running shoes");
  });

  it("does not leave a placeholder behind when there is no keyphrase", () => {
    const reco = getRecommendation("introductionKeyword", "bad", {});
    expect(reco?.key).toBe("reco.introductionKeyword.badNoKeyphrase");
    expect(reco && t(reco.key, reco.vars)).not.toContain("{{");
  });

  it("falls back to a generic message for unmapped ids", () => {
    expect(getRecommendation("somethingNew", "warn", {})).toEqual({ key: "reco.generic.warn" });
  });
});
