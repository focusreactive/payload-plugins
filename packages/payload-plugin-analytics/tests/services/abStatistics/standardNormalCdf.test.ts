import { describe, expect, it } from "vitest";
import { standardNormalCdf } from "../../../src/services/abStatistics/standardNormalCdf";

describe("standardNormalCdf", () => {
  it("is 0.5 at 0 and ~0.975 at 1.96", () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 3);
    expect(standardNormalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(standardNormalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
});
