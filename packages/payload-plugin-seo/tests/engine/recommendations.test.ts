import { describe, expect, it } from "vitest";
import { getRecommendation } from "../../src/engine/recommendations";
import { createTranslator } from "../../src/translations";
import { resolveThresholds } from "../../src/utils/config/resolveThresholds";

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

  it("states the configured numbers", () => {
    const thresholds = resolveThresholds({ metaDescriptionLength: { min: 100, max: 140 } });
    const reco = getRecommendation("metaDescriptionLength", "bad", { thresholds });
    expect(reco && t(reco.key, reco.vars)).toBe(
      "Adjust the meta description toward 100–140 characters."
    );
  });

  it("states the default numbers without configuration", () => {
    const reco = getRecommendation("metaDescriptionLength", "bad", {});
    expect(reco && t(reco.key, reco.vars)).toBe(
      "Adjust the meta description toward 120–156 characters."
    );
  });
});
