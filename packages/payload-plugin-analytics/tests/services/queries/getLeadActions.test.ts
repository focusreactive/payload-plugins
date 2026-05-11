import { describe, expect, it, vi } from "vitest";
import { getLeadActions } from "../../../src/services/queries/getLeadActions";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import leadActions from "../../../__fixtures__/ga4/leadActions.batch.json";

describe("getLeadActions", () => {
  it("calls batchRunReports with 2 reports (events + sessions)", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([leadActions]) };
    __setGa4ClientForTests(fake as never);
    await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    expect(fake.batchRunReports).toHaveBeenCalledTimes(1);
    // DEVIATION FROM PLAN §7.7 VERBATIM TEST:
    // The plan asserted `mock.calls[0][1]` but `runQuery.batchRunReports` invokes the
    // GA4 client as `client.batchRunReports({ property, requests })` — a single object arg —
    // so the second positional arg is undefined. The requests array lives on `.requests`.
    const arg = fake.batchRunReports.mock.calls[0][0].requests;
    expect(arg).toHaveLength(2);
    // events report has dimensionFilter on eventName
    expect(arg[0].dimensionFilter).toBeDefined();
  });

  it("computes conversionRate = totals[kind] / sessionsResp.rows[0].sessions", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([leadActions]) };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    expect(typeof res.current.conversionRate.phone_click).toBe("number");
  });

  it("returns 0 conversionRate when sessions denominator is 0", async () => {
    const zero = {
      reports: [leadActions.reports[0], { rows: [{ dimensionValues: [], metricValues: [{ value: "0" }] }] }],
    };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([zero]) };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    for (const v of Object.values(res.current.conversionRate)) expect(v).toBe(0);
  });

  it("avgTimeToAction = Σ userEngagementDuration / Σ eventCount (seconds)", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([leadActions]) };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    expect(typeof res.current.avgTimeToAction).toBe("number");
    expect(res.current.avgTimeToAction).toBeGreaterThanOrEqual(0);
  });
});
