import { describe, expect, it } from "vitest";
import { sampleRatioMismatchCheck } from "../../../src/services/abStatistics/sampleRatioMismatchCheck";

describe("sampleRatioMismatchCheck", () => {
  it("passes when observed approx configured", () => {
    const r = sampleRatioMismatchCheck([1000, 1000], [0.5, 0.5]);
    expect(r.passed).toBe(true);
    expect(r.pValue).toBeGreaterThan(0.001);
  });

  it("fails on a badly skewed split", () => {
    const r = sampleRatioMismatchCheck([1850, 3100], [0.5, 0.5]);
    expect(r.passed).toBe(false);
    expect(r.pValue).toBeLessThan(0.001);
  });
});
