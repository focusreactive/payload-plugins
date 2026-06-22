import { describe, expect, it, beforeEach } from "vitest";
import { kpisMock } from "../../../../src/services/analyticsService/mocks/kpis";
import {
  setActiveExistingRefs,
  __clearActiveExistingRefs,
} from "../../../../src/services/pageFilter/activeRefsHolder";

// The kpis mock is now a session-level recompute-shape generator (see kpis.mock.test.ts
// for the filtering behavior). This file keeps the dateRange comparison-shape contract.
type Res = { rows: Array<{ dimensionValues: Array<{ value: string }> }> };

describe("kpisMock", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("emits single-period session rows when request has one dateRange (5 dims, no range tag)", async () => {
    const result = (await kpisMock({
      dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }],
    })) as unknown as Res;
    expect(result.rows[0].dimensionValues).toHaveLength(5);
  });

  it("appends a trailing dateRange dim when request has two dateRanges", async () => {
    const result = (await kpisMock({
      dateRanges: [
        { startDate: "2026-05-04", endDate: "2026-05-06", name: "current" },
        { startDate: "2026-05-01", endDate: "2026-05-03", name: "previous" },
      ],
    })) as unknown as Res;
    expect(result.rows[0].dimensionValues).toHaveLength(6);
    const rangeTags = new Set(result.rows.map((r) => r.dimensionValues[5].value));
    expect(rangeTags).toEqual(new Set(["current", "previous"]));
  });
});
