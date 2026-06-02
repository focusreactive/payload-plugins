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
});
