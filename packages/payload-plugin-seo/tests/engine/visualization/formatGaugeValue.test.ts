import { describe, expect, it } from "vitest";
import { DEFAULT_SEO_THRESHOLDS } from "../../../src/constants";
import { formatMarkerValue } from "../../../src/engine/visualization/formatGaugeValue";
import { gaugeSpecsFor } from "../../../src/engine/visualization/gaugeSpecs";

const specs = gaugeSpecsFor(DEFAULT_SEO_THRESHOLDS);

describe("formatMarkerValue", () => {
  const density = specs.keyphraseDensity;
  if (!density) throw new Error("missing density spec");

  it("shows one decimal away from the band edges", () => {
    expect(formatMarkerValue(1.64, density)).toBe("1.6%");
    expect(formatMarkerValue(3, density)).toBe("3.0%");
  });

  it("adds decimals when rounding would put the value on the other side of an edge", () => {
    expect(formatMarkerValue(3.04, density)).toBe("3.04%");
    expect(formatMarkerValue(2.96, density)).toBe("2.96%");
    expect(formatMarkerValue(0.49, density)).toBe("0.49%");
  });

  it("keeps whole units as they are", () => {
    const textLength = specs.textLength;
    if (!textLength) throw new Error("missing text length spec");

    expect(formatMarkerValue(300, textLength)).toBe("300");
  });
});
