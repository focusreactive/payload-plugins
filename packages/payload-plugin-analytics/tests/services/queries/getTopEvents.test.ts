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
});
