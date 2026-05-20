import { describe, expect, it } from "vitest";
import { kpisMock } from "../../../../src/services/analyticsService/mocks/kpis";
import kpisCurrent from "../../../../__fixtures__/ga4/kpis.current.json";
import kpisBoth from "../../../../__fixtures__/ga4/kpis.currentAndPrevious.json";

describe("kpisMock", () => {
  it("returns single-period fixture when request has one dateRange", async () => {
    const result = await kpisMock({
      dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }],
    });
    expect(result).toEqual(kpisCurrent);
  });

  it("returns comparison fixture when request has two dateRanges", async () => {
    const result = await kpisMock({
      dateRanges: [
        { startDate: "2026-05-04", endDate: "2026-05-06", name: "current" },
        { startDate: "2026-05-01", endDate: "2026-05-03", name: "previous" },
      ],
    });
    expect(result).toEqual(kpisBoth);
  });
});
