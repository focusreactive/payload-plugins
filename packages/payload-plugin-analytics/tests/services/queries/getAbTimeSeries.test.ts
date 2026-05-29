import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAbTimeSeries } from "../../../src/services/queries/getAbTimeSeries";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { setPluginConfig } from "../../../src/config";

const r = (dims: string[]) => ({ dimensionValues: dims.map((value) => ({ value })), metricValues: [{ value: "1" }] });

beforeEach(() => {
  setPluginConfig({ ga4: { propertyId: "1", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } }, ab: {} } as never);
});
afterEach(() => vi.restoreAllMocks());

describe("getAbTimeSeries", () => {
  it("builds control-first cumulative series per bucket from daily session/converting reports", async () => {
    const sessions = {
      rows: [
        r(["20260501", "original", "s1"]), r(["20260501", "original", "s2"]),
        r(["20260502", "original", "s3"]),
        r(["20260501", "about--a", "s4"]), r(["20260502", "about--a", "s5"]),
      ],
    };
    const converting = {
      rows: [
        r(["20260501", "original", "s1"]),
        r(["20260502", "about--a", "s5"]),
      ],
    };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([{ reports: [sessions, converting] }]) };
    __setGa4ClientForTests(fake as never);

    const res = await getAbTimeSeries("/x", { dateRange: { preset: "last-14d" } });
    expect(res.series[0].bucket).toBe("original");
    const ctrl = res.series[0];
    expect(ctrl.days.map((d) => d.date)).toEqual(["20260501", "20260502"]);
    // cumulative sessions: day1=2, day2=3
    expect(ctrl.days[0].cumulativeSessions).toBe(2);
    expect(ctrl.days[1].cumulativeSessions).toBe(3);
    // cumulative converting: day1=1, day2=1
    expect(ctrl.days[1].cumulativeConvertingSessions).toBe(1);
    expect(res.significanceDates).toHaveProperty("about--a");
  });
});
