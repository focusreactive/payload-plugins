import { describe, expect, it } from "vitest";
import { refineRecommendation } from "../../src/engine/recommendations";

describe("refineRecommendation", () => {
  it("tells the editor to use a multi-word keyphrase less often when it is over the weighted maximum", () => {
    const reco = refineRecommendation(
      { id: "keyphraseDensity", status: "bad" },
      { densityPct: 2.4, lengthFactor: 1.7 }
    );

    expect(reco).toEqual({ key: "reco.keyphraseDensity.over" });
  });

  it("keeps the default advice when the keyphrase is underused", () => {
    const reco = refineRecommendation(
      { id: "keyphraseDensity", status: "bad" },
      { densityPct: 0.2, lengthFactor: 1.7 }
    );

    expect(reco).toBeUndefined();
  });
});
