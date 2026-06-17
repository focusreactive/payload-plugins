// tests/services/analyticsService/mocks/ga4RowBuilder.test.ts
import { describe, expect, it } from "vitest";
import { row, response, batch } from "../../../../src/services/analyticsService/mocks/ga4RowBuilder";

describe("ga4RowBuilder", () => {
  it("row builds dimensionValues/metricValues from string arrays", () => {
    expect(row(["/a", "A"], ["10", "5"])).toEqual({
      dimensionValues: [{ value: "/a" }, { value: "A" }],
      metricValues: [{ value: "10" }, { value: "5" }],
    });
  });

  it("response wraps rows + rowCount", () => {
    const r = response([row(["/a"], ["1"])]);
    expect(r.rows).toHaveLength(1);
    expect(r.rowCount).toBe(1);
  });

  it("batch wraps multiple reports", () => {
    expect(batch([response([]), response([])]).reports).toHaveLength(2);
  });
});
