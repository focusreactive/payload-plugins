import { describe, expect, it, vi } from "vitest";
import { getTopEvents } from "../../../src/services/queries/getTopEvents";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import topEvents from "../../../__fixtures__/ga4/topEvents.json";

describe("getTopEvents", () => {
  it("requests eventName dim + eventCount/eventCountPerUser metrics", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topEvents]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopEvents("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([{ name: "eventName" }]);
    expect(arg.metrics).toEqual([{ name: "eventCount" }, { name: "eventCountPerUser" }]);
  });
  it("maps rows to TopEventsRow with numeric counts", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topEvents]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopEvents("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(typeof res.rows[0].eventCount).toBe("number");
  });
  it("applies fr_page_ref inList filter when pageFilter has refs", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topEvents]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopEvents(
      "12345",
      { dateRange: { preset: "last-7d" } },
      {
        refs: ["page:1", "__home"],
        pageRefDim: "customEvent:fr_page_ref",
        contentLocaleDim: "customEvent:fr_content_locale",
        resolveLabels: async () => new Map(),
      }
    );
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toEqual({
      filter: {
        fieldName: "customEvent:fr_page_ref",
        inListFilter: { values: ["page:1", "__home"] },
      },
    });
  });
  it("adds no fr_page_ref filter when pageFilter is null", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topEvents]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopEvents("12345", { dateRange: { preset: "last-7d" } }, null);
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toBeUndefined();
  });
});
