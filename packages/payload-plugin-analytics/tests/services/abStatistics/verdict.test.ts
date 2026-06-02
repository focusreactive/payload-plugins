import { describe, expect, it } from "vitest";
import { verdict } from "../../../src/services/abStatistics/verdict";

describe("verdict", () => {
  it("labels winner / loser / ns / none", () => {
    expect(verdict({ pValue: 0.01, relativeLift: 0.2 })).toBe("winner");
    expect(verdict({ pValue: 0.01, relativeLift: -0.2 })).toBe("loser");
    expect(verdict({ pValue: 0.3, relativeLift: 0.2 })).toBe("ns");
    expect(verdict(null)).toBe("none");
  });
});
