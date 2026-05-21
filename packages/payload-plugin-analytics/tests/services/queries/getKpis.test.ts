import { describe, expect, it, vi } from "vitest";
import { getKpis } from "../../../src/services/queries/getKpis";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import kpisCurrent from "../../../__fixtures__/ga4/kpis.current.json";
import kpisBoth    from "../../../__fixtures__/ga4/kpis.currentAndPrevious.json";

// `runQuery.runReport` destructures the SDK tuple `[response]`. Mocks must return
// a tuple matching the real SDK shape — wrap fixtures in `[fixture]` accordingly.
describe("getKpis", () => {
  it("builds single-dateRange request when no comparison", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisCurrent]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } });
    expect(fake.runReport).toHaveBeenCalledWith(expect.objectContaining({
      property:   "properties/12345",
      dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06", name: "current" }],
      metrics: expect.arrayContaining([
        { name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" },
        { name: "bounceRate" }, { name: "averageSessionDuration" },
      ]),
      dimensions: [{ name: "date" }],
    }));
  });

  it("builds two-dateRange request when comparison=previous-period", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisBoth]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getKpis("12345", {
      dateRange:  { from: "2026-05-04", to: "2026-05-06" },
      comparison: { kind: "previous-period" },
    });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dateRanges).toHaveLength(2);
    expect(arg.dateRanges[0].name).toBe("current");
    expect(arg.dateRanges[1].name).toBe("previous");
    expect(arg.dimensions).toEqual([{ name: "date" }]);
  });

  it("returns numeric current values", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisCurrent]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } });
    expect(typeof res.current.sessions).toBe("number");
    expect(res.current.sessions).toBe(120 + 140 + 130);
  });

  it("builds series from current rows ordered by date", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisCurrent]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } });
    expect(res.series.map((p) => p.date)).toEqual(["2026-05-04", "2026-05-05", "2026-05-06"]);
  });

  it("populates comparison block when requested", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisBoth]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getKpis("12345", {
      dateRange:  { from: "2026-05-04", to: "2026-05-06" },
      comparison: { kind: "previous-period" },
    });
    expect(res.comparison).toBeDefined();
    expect(typeof res.comparison?.sessions).toBe("number");
  });
});
