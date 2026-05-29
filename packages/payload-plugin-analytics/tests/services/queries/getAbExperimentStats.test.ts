import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAbExperimentStats } from "../../../src/services/queries/getAbExperimentStats";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { setPluginConfig } from "../../../src/config";

const r = (dims: string[], metrics: string[] = []) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value })),
});

beforeEach(() => {
  setPluginConfig({
    ga4: { propertyId: "1", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } },
    // name -> "title" so the variant display name resolves from the doc's title field;
    // with an empty `ab: {}` the resolver defaults `name` to the slug field (Phase 3 spec).
    ab: { variantFields: { name: "title" } },
  } as never);
});
afterEach(() => vi.restoreAllMocks());

function makeReq() {
  return {
    payload: {
      find: vi.fn().mockImplementation(({ collection }: { collection: string }) => {
        if (collection === "ab-experiments") {
          return Promise.resolve({
            docs: [{ manifestKey: "/en/pricing", parentDocId: "p1", parentCollection: "pages", locale: "en", startedAt: "2026-04-20" }],
          });
        }
        // variant docs
        return Promise.resolve({ docs: [{ slug: "pricing--b", _abPassPercentage: 50, title: "Annual" }] });
      }),
    },
  };
}

describe("getAbExperimentStats", () => {
  it("returns control-first buckets with sessions, visitors, converting sessions, raw conversions, configured share", async () => {
    const exposure = {
      rows: [
        r(["original", "s1", "v1"]), r(["original", "s2", "v2"]),
        r(["pricing--b", "s3", "v3"]),
      ],
    };
    const converting = {
      rows: [
        r(["original", "s1", "phone_click"], ["2"]),
        r(["pricing--b", "s3", "form_submit"], ["1"]),
      ],
    };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([{ reports: [exposure, converting] }]) };
    __setGa4ClientForTests(fake as never);

    const res = await getAbExperimentStats("/en/pricing", { dateRange: { preset: "last-30d" } }, makeReq() as never);
    expect(res.buckets[0].bucket).toBe("original"); // control first
    expect(res.buckets[0]).toMatchObject({ sessions: 2, visitors: 2, convertingSessions: 1, rawConversions: 2, configuredShare: 0.5 });
    const variant = res.buckets.find((b) => b.bucket === "pricing--b")!;
    expect(variant).toMatchObject({ sessions: 1, convertingSessions: 1, rawConversions: 1, configuredShare: 0.5, name: "Annual" });
    expect(res.byBucketLead["original"]["phone_click"]).toBe(1);
  });
});
