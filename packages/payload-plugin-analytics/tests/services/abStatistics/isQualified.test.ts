import { describe, expect, it } from "vitest";
import { isQualified } from "../../../src/services/abStatistics/isQualified";

describe("isQualified", () => {
  const opts = { mdeCeiling: 0.2, sessionFloor: 100, alpha: 0.05, power: 0.8 };

  it("qualifies a well-powered, SRM-passing experiment", () => {
    expect(isQualified({ controlRate: 0.1, minBucketSessions: 20000, srmPassed: true }, opts)).toBe(true);
  });

  it("disqualifies when relative MDE exceeds the ceiling (underpowered)", () => {
    expect(isQualified({ controlRate: 0.1, minBucketSessions: 300, srmPassed: true }, opts)).toBe(false);
  });

  it("disqualifies below the session floor", () => {
    expect(isQualified({ controlRate: 0.1, minBucketSessions: 50, srmPassed: true }, opts)).toBe(false);
  });

  it("disqualifies on SRM failure regardless of power", () => {
    expect(isQualified({ controlRate: 0.1, minBucketSessions: 20000, srmPassed: false }, opts)).toBe(false);
  });
});
