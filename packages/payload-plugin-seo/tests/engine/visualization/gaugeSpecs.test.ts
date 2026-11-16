import { describe, expect, it } from "vitest";
import { DEFAULT_SEO_THRESHOLDS } from "../../../src/constants";
import { GAUGE_SPECS, gaugeSpecsFor } from "../../../src/engine/visualization/gaugeSpecs";
import { resolveThresholds } from "../../../src/utils/config/resolveThresholds";

describe("gaugeSpecsFor", () => {
  it("builds the default specs from the default thresholds", () => {
    expect(gaugeSpecsFor(DEFAULT_SEO_THRESHOLDS)).toEqual(GAUGE_SPECS);
    expect(GAUGE_SPECS.keyphraseDensity).toMatchObject({ axisMax: 5, thresholds: [0.5, 3] });
    expect(GAUGE_SPECS.textLength).toMatchObject({ axisMax: 350, thresholds: [250, 300] });
  });

  it("places the bands at the configured thresholds", () => {
    const specs = gaugeSpecsFor(
      resolveThresholds({ metaDescriptionLength: { min: 100, max: 140 }, titleWidth: { max: 650 } })
    );

    expect(specs.metaDescriptionLength?.thresholds).toEqual([0, 100, 140]);
    expect(specs.titleWidth?.thresholds).toEqual([400, 650]);
  });

  it("widens the axis when a threshold reaches its end", () => {
    const specs = gaugeSpecsFor(
      resolveThresholds({ textLength: { min: 1000, acceptableMin: 800 } })
    );

    expect(specs.textLength).toMatchObject({ axisMax: 1250, thresholds: [800, 1000] });
  });

  it("never widens a percentage axis past 100", () => {
    const specs = gaugeSpecsFor(
      resolveThresholds({ textSentenceLength: { max: 80, acceptableMax: 90 } })
    );

    expect(specs.textSentenceLength?.axisMax).toBe(100);
  });
});
