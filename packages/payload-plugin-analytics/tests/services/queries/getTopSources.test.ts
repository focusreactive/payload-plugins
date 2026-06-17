import { describe, expect, it, vi } from "vitest";
import { getTopSources } from "../../../src/services/queries/getTopSources";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import topSources from "../../../__fixtures__/ga4/topSources.json";

describe("getTopSources", () => {
  it("requests source/medium/channel dims + sessions/totalUsers metrics", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topSources]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopSources("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([{ name: "sessionSource" }, { name: "sessionMedium" }, { name: "sessionDefaultChannelGroup" }]);
    expect(arg.metrics).toEqual([{ name: "sessions" }, { name: "totalUsers" }]);
  });
  it("maps rows to TopSourcesRow with numeric counts", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topSources]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopSources("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(typeof res.rows[0].sessions).toBe("number");
    expect(typeof res.rows[0].users).toBe("number");
  });
  it("applies fr_page_ref inList filter when pageFilter has refs", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topSources]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopSources("12345", { dateRange: { preset: "last-7d" } }, { refs: ["page:1", "__home"], pageRefDim: "customEvent:fr_page_ref", contentLocaleDim: "customEvent:fr_content_locale" });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toEqual({ filter: { fieldName: "customEvent:fr_page_ref", inListFilter: { values: ["page:1", "__home"] } } });
  });
  it("adds no fr_page_ref filter when pageFilter is null", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topSources]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopSources("12345", { dateRange: { preset: "last-7d" } }, null);
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toBeUndefined();
  });
});
