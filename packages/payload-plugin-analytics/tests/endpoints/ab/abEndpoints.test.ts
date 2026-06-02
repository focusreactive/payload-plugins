import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAbKpisEndpoint } from "../../../src/endpoints/ab/kpis";
import { buildAbExperimentExposureEndpoint } from "../../../src/endpoints/ab/experimentExposure";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { setPluginConfig } from "../../../src/config";
import { makePayloadRequest } from "../../../__fixtures__/http/payloadRequest";
import type { AnalyticsPluginConfig } from "../../../src/types/config";

const cfg = { ga4: { propertyId: "1", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } }, ab: {} } as AnalyticsPluginConfig;

function callHandler(ep: { handler: unknown }, req: unknown): Promise<Response> {
  return (ep.handler as (r: unknown) => Promise<Response>)(req);
}

beforeEach(() => setPluginConfig(cfg));

describe("A/B endpoints", () => {
  it("kpis: 403 unauthenticated", async () => {
    const res = await callHandler(buildAbKpisEndpoint(cfg), makePayloadRequest({ user: null, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(403);
  });

  it("exposure: 400 when manifestKey missing", async () => {
    const res = await callHandler(buildAbExperimentExposureEndpoint(cfg), makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(400);
  });

  it("kpis: returns setup-gate payload with missing dims when GA4 reports the dimension unregistered", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_ab_experiment is unrecognized.");
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockRejectedValue(err) };
    __setGa4ClientForTests(fake as never);
    const reqObj = makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } });
    // getAbOverview reads records first; stub payload.find to return one record so it reaches GA4
    (reqObj as unknown as { payload: { find: unknown } }).payload = {
      find: vi.fn().mockResolvedValue({ docs: [{ manifestKey: "/p", parentDocId: "p", parentCollection: "pages", locale: null, startedAt: "2026-05-01" }] }),
    };
    const res = await callHandler(buildAbKpisEndpoint(cfg), reqObj);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.missing).toContain("fr_ab_experiment");
  });
});
