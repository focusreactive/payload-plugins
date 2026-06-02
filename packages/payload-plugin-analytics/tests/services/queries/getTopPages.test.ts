import { describe, expect, it, vi } from "vitest";
import { getTopPages } from "../../../src/services/queries/getTopPages";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import topPages from "../../../__fixtures__/ga4/topPages.json";

describe("getTopPages", () => {
  it("builds request with pagePath + pageTitle dimensions and screenPageViews/sessions/avgSessionDuration metrics", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topPages]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopPages("12345", { dateRange: { preset: "last-7d" }, limit: 5 });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([{ name: "pagePath" }, { name: "pageTitle" }]);
    expect(arg.metrics).toEqual(expect.arrayContaining([{ name: "screenPageViews" }, { name: "sessions" }, { name: "averageSessionDuration" }]));
    expect(arg.limit).toBe(5);
  });

  it("returns numeric rows + total", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topPages]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopPages("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(typeof res.rows[0].pageViews).toBe("number");
    expect(res.total).toBe(res.rows.reduce((a, r) => a + r.pageViews, 0));
  });

  it("comparison.rows is keyed on current rows; previous-only rows are dropped", async () => {
    const fixture = {
      rows: [
        { dimensionValues: [{ value: "/a" }, { value: "A" }, { value: "current" }], metricValues: [{ value: "100" }, { value: "50" }, { value: "30" }] },
        { dimensionValues: [{ value: "/a" }, { value: "A" }, { value: "previous" }], metricValues: [{ value: "80" }, { value: "40" }, { value: "28" }] },
        { dimensionValues: [{ value: "/b" }, { value: "B" }, { value: "previous" }], metricValues: [{ value: "60" }, { value: "30" }, { value: "25" }] },
      ],
    };
    const fake = { runReport: vi.fn().mockResolvedValue([fixture]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopPages("12345", { dateRange: { preset: "last-7d" }, comparison: { kind: "previous-period" } });
    expect(res.rows.map((r) => r.pagePath)).toEqual(["/a"]);
    expect(res.comparison?.rows.map((r) => r.pagePath)).toEqual(["/a"]);
  });
});
