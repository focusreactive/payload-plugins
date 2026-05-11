import { describe, expect, it } from "vitest";
import { bucketByDateRange, computeWeightedValuesAverage, convertMetricToNumber } from "../../../src/utils/ga4";

describe("bucketByDateRange", () => {
  it("splits rows by the dateRange dimension value (last dim)", () => {
    const rows = [
      { dimensionValues: [{ value: "2026-05-10" }, { value: "current" }], metricValues: [{ value: "100" }] },
      { dimensionValues: [{ value: "2026-05-03" }, { value: "previous" }], metricValues: [{ value: "80" }] },
    ];
    const { current, previous } = bucketByDateRange(rows, ["current", "previous"]);
    expect(current).toHaveLength(1);
    expect(previous).toHaveLength(1);
    expect(current[0].metricValues?.[0].value).toBe("100");
  });
  it("returns empty buckets for missing names", () => {
    expect(bucketByDateRange([], ["current", "previous"])).toEqual({ current: [], previous: [] });
  });
});

describe("convertMetricToNumber", () => {
  it("parses numeric strings", () => {
    expect(convertMetricToNumber("123.45")).toBe(123.45);
    expect(convertMetricToNumber("0")).toBe(0);
  });
  it("returns 0 for null / undefined / empty / non-numeric", () => {
    expect(convertMetricToNumber(undefined)).toBe(0);
    expect(convertMetricToNumber(null)).toBe(0);
    expect(convertMetricToNumber("")).toBe(0);
    expect(convertMetricToNumber("not a number")).toBe(0);
  });
});

describe("computeWeightedValuesAverage", () => {
  it("weights perDayAvg values by sessions", () => {
    // day1: 100s avg, 10 sessions; day2: 200s avg, 30 sessions → (100*10 + 200*30) / 40 = 175
    expect(
      computeWeightedValuesAverage([
        { value: 100, weight: 10 },
        { value: 200, weight: 30 },
      ]),
    ).toBe(175);
  });
  it("returns 0 when total weight is 0", () => {
    expect(computeWeightedValuesAverage([{ value: 100, weight: 0 }])).toBe(0);
  });
});
