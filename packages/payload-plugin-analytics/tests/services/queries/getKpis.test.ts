import { describe, expect, it, vi } from "vitest";
import { getKpis } from "../../../src/services/queries/getKpis";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import kpisCurrent from "../../../__fixtures__/ga4/kpis.current.json";
import kpisBoth from "../../../__fixtures__/ga4/kpis.currentAndPrevious.json";

// `runQuery.runReport` destructures the SDK tuple `[response]`. Mocks must return
// a tuple matching the real SDK shape — wrap fixtures in `[fixture]` accordingly.
describe("getKpis", () => {
  it("builds single-dateRange request when no comparison", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisCurrent]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } });
    expect(fake.runReport).toHaveBeenCalledWith(
      expect.objectContaining({
        property: "properties/12345",
        dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06", name: "current" }],
        metrics: expect.arrayContaining([{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }, { name: "bounceRate" }, { name: "averageSessionDuration" }]),
        dimensions: [{ name: "date" }],
      })
    );
  });

  it("builds two-dateRange request when comparison=previous-period", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisBoth]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getKpis("12345", {
      dateRange: { from: "2026-05-04", to: "2026-05-06" },
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
      dateRange: { from: "2026-05-04", to: "2026-05-06" },
      comparison: { kind: "previous-period" },
    });
    expect(res.comparison).toBeDefined();
    expect(typeof res.comparison?.sessions).toBe("number");
  });

  it("populates comparisonSeries from previous-period rows ordered by date", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisBoth]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getKpis("12345", {
      dateRange: { from: "2026-05-04", to: "2026-05-06" },
      comparison: { kind: "previous-period" },
    });
    expect(res.comparisonSeries).toBeDefined();
    expect(res.comparisonSeries?.map((p) => p.date)).toEqual(["2026-04-27", "2026-04-28", "2026-04-29"]);
    expect(res.comparisonSeries?.[0]?.sessions).toBe(100);
  });

  it("omits comparisonSeries when no comparison requested", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisCurrent]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } });
    expect(res.comparisonSeries).toBeUndefined();
  });

  it("keeps the native-metric path when pageFilter is null (no refs)", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisCurrent]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } }, null);
    expect(fake.runReport).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: expect.arrayContaining([{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }, { name: "bounceRate" }, { name: "averageSessionDuration" }]),
        dimensions: [{ name: "date" }],
      })
    );
  });

  const PAGE_FILTER = {
    refs: ["page:1", "__home"],
    pageRefDim: "customEvent:fr_page_ref",
    contentLocaleDim: "customEvent:fr_content_locale",
    resolveLabels: async () => new Map(),
  };

  function sessionLevelReport(rows: unknown[]) {
    return {
      dimensionHeaders: [],
      metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
      rows,
      rowCount: rows.length,
    };
  }

  it("issues a session-level report (fr_session_id + date + pageRefDim + eventName + dateHourMinute) when pageFilter has refs", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([sessionLevelReport([])]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } }, PAGE_FILTER);
    const arg = fake.runReport.mock.calls[0][0];
    const dimNames = arg.dimensions.map((d: { name: string }) => d.name);
    expect(dimNames).toContain("customEvent:fr_session_id");
    expect(dimNames).toContain("date");
    expect(dimNames).toContain("customEvent:fr_page_ref");
    expect(dimNames).toContain("eventName");
    expect(dimNames).toContain("dateHourMinute");
    // fr_elapsed_ms is a custom METRIC, not a dimension — must not be requested as a dim.
    expect(dimNames).not.toContain("customEvent:fr_elapsed_ms");
    expect(arg.metrics).toEqual([{ name: "eventCount" }]);
  });

  it("excludes a deleted-ref session from current totals under pageFilter", async () => {
    const r = (sessionId: string, pageRef: string, eventName: string, elapsedMs: string) => ({
      dimensionValues: [{ value: sessionId }, { value: "20260504" }, { value: pageRef }, { value: eventName }, { value: elapsedMs }],
      metricValues: [{ value: "1" }],
    });
    const report = sessionLevelReport([
      r("s1", "page:1", "page_view", "1000"),
      r("s1", "__home", "page_view", "3000"),
      // s2 touched a deleted ref → excluded
      r("s2", "page:999", "page_view", "9000"),
    ]);
    const fake = { runReport: vi.fn().mockResolvedValue([report]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } }, PAGE_FILTER);
    expect(res.current.sessions).toBe(1);
    expect(res.current.pageViews).toBe(2);
    expect(res.current.users).toBe(1);
  });

  it("populates comparison + comparisonSeries from the previous range under pageFilter", async () => {
    const r = (sessionId: string, date: string, pageRef: string) => ({
      dimensionValues: [{ value: sessionId }, { value: date }, { value: pageRef }, { value: "page_view" }, { value: "1000" }],
      metricValues: [{ value: "1" }],
    });
    // With two date ranges GA4 appends a trailing `dateRange` dim whose value is
    // the range NAME we assigned ("current" / "previous"); the service splits on it.
    const withRange = (base: ReturnType<typeof r>, range: string) => ({
      ...base,
      dimensionValues: [...base.dimensionValues, { value: range }],
    });
    const report = sessionLevelReport([withRange(r("c1", "20260504", "page:1"), "current"), withRange(r("p1", "20260427", "page:1"), "previous")]);
    const fake = { runReport: vi.fn().mockResolvedValue([report]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" }, comparison: { kind: "previous-period" } }, PAGE_FILTER);
    expect(res.current.sessions).toBe(1);
    expect(res.comparison?.sessions).toBe(1);
    expect(res.series).toHaveLength(1);
    expect(res.comparisonSeries).toHaveLength(1);
  });

  it("surfaces a setup gate (mapped error) including fr_page_ref under pageFilter", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_page_ref is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await expect(getKpis("12345", { dateRange: { from: "2026-05-04", to: "2026-05-06" } }, PAGE_FILTER)).rejects.toBe(err);
  });
});
