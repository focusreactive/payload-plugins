import { describe, expect, it } from "vitest";
import { portfolioWinRate } from "../../../src/services/abStatistics/portfolioWinRate";

describe("portfolioWinRate", () => {
  it("rate = winners / qualified; counts non-qualified separately", () => {
    const r = portfolioWinRate([
      { qualified: true, hasWinner: true },
      { qualified: true, hasWinner: false },
      { qualified: false, hasWinner: false },
    ]);
    expect(r).toEqual({ winners: 1, qualified: 2, notQualified: 1, rate: 0.5 });
  });

  it("rate is null when nothing is qualified", () => {
    const r = portfolioWinRate([{ qualified: false, hasWinner: false }]);
    expect(r.rate).toBeNull();
    expect(r.qualified).toBe(0);
    expect(r.notQualified).toBe(1);
  });
});
