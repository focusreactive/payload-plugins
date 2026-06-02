import { describe, expect, it } from "vitest";
import { confidence } from "../../../src/services/abStatistics/confidence";

describe("confidence", () => {
  it("is Φ(z): 0.5 at 0, ~0.975 at 1.96", () => {
    expect(confidence(0)).toBeCloseTo(0.5, 3);
    expect(confidence(1.96)).toBeCloseTo(0.975, 3);
    expect(confidence(-1.96)).toBeCloseTo(0.025, 3);
  });
});
