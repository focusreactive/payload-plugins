import { describe, expect, it } from "vitest";
import { DEFAULT_SEO_THRESHOLDS } from "../../src/constants";
import { directionalRecommendation, getRecommendation } from "../../src/engine/recommendations";
import { createTranslator } from "../../src/translations";
import { resolveThresholds } from "../../src/utils/config/resolveThresholds";

const t = createTranslator("en", undefined);

describe("getRecommendation", () => {
  it("returns undefined for good status", () => {
    expect(
      getRecommendation("keyphraseDensity", "good", { thresholds: DEFAULT_SEO_THRESHOLDS })
    ).toBeUndefined();
  });

  it("returns a message carrying the keyphrase for a known id + bad status", () => {
    const reco = getRecommendation("introductionKeyword", "bad", {
      keyphrase: "best running shoes",
      thresholds: DEFAULT_SEO_THRESHOLDS,
    });
    expect(reco).toEqual({
      key: "reco.introductionKeyword.bad",
      vars: { keyphrase: "best running shoes" },
    });
    expect(reco && t(reco.key, reco.vars)).toContain("best running shoes");
  });

  it("does not leave a placeholder behind when there is no keyphrase", () => {
    const reco = getRecommendation("introductionKeyword", "bad", {
      thresholds: DEFAULT_SEO_THRESHOLDS,
    });
    expect(reco?.key).toBe("reco.introductionKeyword.badNoKeyphrase");
    expect(reco && t(reco.key, reco.vars)).not.toContain("{{");
  });

  it("falls back to a generic message for unmapped ids", () => {
    expect(
      getRecommendation("somethingNew", "warn", { thresholds: DEFAULT_SEO_THRESHOLDS })
    ).toEqual({ key: "reco.generic.warn" });
  });

  it("states the configured numbers", () => {
    const thresholds = resolveThresholds({ metaDescriptionLength: { min: 100, max: 140 } });
    const reco = getRecommendation("metaDescriptionLength", "bad", { thresholds });
    expect(reco && t(reco.key, reco.vars)).toBe(
      "Write a meta description longer than 100 and up to 140 characters."
    );
  });

  it("states the default numbers", () => {
    const reco = getRecommendation("metaDescriptionLength", "bad", {
      thresholds: DEFAULT_SEO_THRESHOLDS,
    });
    expect(reco && t(reco.key, reco.vars)).toBe(
      "Write a meta description longer than 120 and up to 156 characters."
    );
  });
});

describe("directionalRecommendation", () => {
  const text = (id: string, data: Record<string, unknown>, status: "warn" | "bad" = "bad") => {
    const reco = directionalRecommendation(id, status, data, DEFAULT_SEO_THRESHOLDS);
    return reco && t(reco.key, reco.vars);
  };

  it("asks for more keyphrases below the band and fewer above it", () => {
    expect(
      text("keyphraseDensity", { densityPct: 0.3, textLength: 300, minTextLength: 100, count: 1 })
    ).toMatch(/a few more times/u);
    expect(
      text("keyphraseDensity", { densityPct: 3.3, textLength: 300, minTextLength: 100, count: 12 })
    ).toMatch(/less often/u);
  });

  it("counts matches instead of the density in short texts", () => {
    expect(
      text("keyphraseDensity", { densityPct: 9, textLength: 60, minTextLength: 100, count: 3 })
    ).toMatch(/less often/u);
    expect(
      text("keyphraseDensity", { densityPct: 0, textLength: 60, minTextLength: 100, count: 0 })
    ).toMatch(/a few more times/u);
  });

  it("asks to lengthen a short meta description and trim a long one", () => {
    expect(text("metaDescriptionLength", { chars: 120 }, "warn")).toBe(
      "Lengthen the meta description to more than 120 characters."
    );
    expect(text("metaDescriptionLength", { chars: 157 }, "warn")).toBe(
      "Trim the meta description to 156 characters or fewer to avoid truncation."
    );
  });

  it("states the maximum title width", () => {
    expect(text("titleWidth", { px: 700 })).toBe(
      "Shorten the SEO title to 600px or less to avoid truncation."
    );
  });

  it("leaves good checks and unknown data alone", () => {
    expect(
      directionalRecommendation("titleWidth", "good", { px: 700 }, DEFAULT_SEO_THRESHOLDS)
    ).toBe(undefined);
    expect(directionalRecommendation("titleWidth", "bad", {}, DEFAULT_SEO_THRESHOLDS)).toBe(
      undefined
    );
  });
});
