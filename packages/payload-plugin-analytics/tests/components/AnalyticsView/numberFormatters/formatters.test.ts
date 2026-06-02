import { describe, expect, it } from "vitest";
import { formatCompactNumber, formatNumber, formatPercentage, formatDuration, formatShortDate } from "../../../../src/components/AnalyticsView/numberFormatters";

describe("formatters", () => {
  it("formatCompactNumber: thousands/millions abbreviation", () => {
    expect(formatCompactNumber(900)).toBe("900");
    expect(formatCompactNumber(1200)).toBe("1.2k");
    expect(formatCompactNumber(10000)).toBe("10k");
    expect(formatCompactNumber(1_500_000)).toBe("1.5M");
  });
  it("formatNumber: locale-grouped", () => {
    expect(formatNumber(18234)).toBe("18,234");
  });
  it("formatPercentage: 1 decimal, percent sign", () => {
    expect(formatPercentage(0.412)).toBe("41.2%");
    expect(formatPercentage(1)).toBe("100.0%");
  });
  it("formatDuration: Xm Yys", () => {
    expect(formatDuration(168)).toBe("2m 48s");
    expect(formatDuration(59)).toBe("0m 59s");
  });
  it("formatShortDate: short MMM D", () => {
    expect(formatShortDate("2026-05-12")).toMatch(/May 1[12]/u);
  });
});
