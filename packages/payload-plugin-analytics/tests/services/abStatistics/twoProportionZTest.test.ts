import { describe, expect, it } from "vitest";
import { twoProportionZTest } from "../../../src/services/abStatistics/twoProportionZTest";

describe("twoProportionZTest", () => {
  it("flags a clearly significant lift", () => {
    // control 357/4200 = 8.5%, variant 252/2100 = 12.0%
    const t = twoProportionZTest(252, 2100, 357, 4200);
    expect(t.variantRate).toBeCloseTo(0.12, 3);
    expect(t.controlRate).toBeCloseTo(0.085, 3);
    expect(t.relativeLift).toBeGreaterThan(0.3);
    expect(t.pValue).toBeLessThan(0.05);
  });

  it("returns p approx 1 for identical proportions", () => {
    const t = twoProportionZTest(100, 1000, 100, 1000);
    expect(t.absoluteLift).toBeCloseTo(0, 6);
    expect(t.pValue).toBeGreaterThan(0.9);
  });

  it("guards divide-by-zero", () => {
    const t = twoProportionZTest(0, 0, 10, 100);
    expect(t.pValue).toBe(1);
    expect(t.zScore).toBe(0);
  });
});
