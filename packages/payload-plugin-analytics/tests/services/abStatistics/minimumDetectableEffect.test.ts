import { describe, expect, it } from "vitest";
import {
  inverseStandardNormalCdf,
  minimumDetectableEffect,
} from "../../../src/services/abStatistics/minimumDetectableEffect";

describe("inverseStandardNormalCdf", () => {
  it("inverts the standard normal CDF", () => {
    expect(inverseStandardNormalCdf(0.975)).toBeCloseTo(1.96, 2);
    expect(inverseStandardNormalCdf(0.8)).toBeCloseTo(0.8416, 2);
  });
});

describe("minimumDetectableEffect", () => {
  it("returns positive absolute + relative effect sizes", () => {
    const m = minimumDetectableEffect(0.085, 2100);
    expect(m).not.toBeNull();
    expect(m!.absolute).toBeGreaterThan(0);
    expect(m!.relative).toBeGreaterThan(0);
  });

  it("returns null for degenerate inputs", () => {
    expect(minimumDetectableEffect(0, 1000)).toBeNull();
    expect(minimumDetectableEffect(0.1, 0)).toBeNull();
  });
});
