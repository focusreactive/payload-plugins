import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAbOverview } from "../../../src/services/queries/getAbOverview";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { setPluginConfig } from "../../../src/config";

const r = (dims: string[], metrics: string[] = ["1"]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value })),
});

beforeEach(() => {
  setPluginConfig({ ga4: { propertyId: "1", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } }, ab: {} } as never);
});
afterEach(() => vi.restoreAllMocks());

function makeReq() {
  return {
    payload: {
      find: vi.fn().mockImplementation(({ collection }: { collection: string }) => {
        if (collection === "ab-experiments") {
          return Promise.resolve({
            docs: [{ manifestKey: "/p", parentDocId: "p1", parentCollection: "pages", locale: null, startedAt: new Date(Date.now() - 10 * 86400000).toISOString() }],
          });
        }
        return Promise.resolve({ docs: [{ slug: "p--b", _abPassPercentage: 50, title: "B" }] });
      }),
    },
  };
}

describe("getAbOverview", () => {
  it("computes KPIs and one table row", async () => {
    // exposure dims [experiment, variant, sessionId, visitorId]
    const exposure = { rows: [r(["/p", "original", "s1", "v1"]), r(["/p", "original", "s2", "v2"]), r(["/p", "p--b", "s3", "v3"])] };
    // converting-by-bucket dims [experiment, variant, sessionId]
    const convByBucket = { rows: [r(["/p", "original", "s1"]), r(["/p", "p--b", "s3"])] };
    // lead-conv-by-page dims [experiment, pagePath], metric eventCount
    const convByPage = { rows: [r(["/p", "/p"], ["12"]), r(["/p", "/other"], ["3"])] };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([{ reports: [exposure, convByBucket, convByPage] }]) };
    __setGa4ClientForTests(fake as never);

    const out = await getAbOverview({ dateRange: { preset: "last-30d" } }, makeReq() as never);
    expect(out.kpis.activeExperiments).toBe(1);
    expect(out.kpis.variantsLive).toBe(1); // 2 buckets - control
    expect(out.kpis.exposedSessions).toBe(3);
    expect(out.kpis.leadConversions).toBe(12); // only pagePath==experiment row
    expect(out.kpis.avgAgeDays).toBeGreaterThanOrEqual(9);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].manifestKey).toBe("/p");
    expect(out.rows[0].variantCount).toBe(1);
    expect(out.rows[0].visitors).toBe(3);
    // tiny sample (1-2 sessions/bucket) is below the 100-session floor → not qualified
    expect(out.kpis.winRate.qualified).toBe(0);
    expect(out.kpis.winRate.notQualified).toBe(1);
    expect(out.kpis.winRate.rate).toBeNull();
  });
});
