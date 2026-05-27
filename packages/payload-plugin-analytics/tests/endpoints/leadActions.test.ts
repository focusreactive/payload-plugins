import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildLeadActionsEndpoint } from "../../src/endpoints/leadActions";
import { __setGa4ClientForTests } from "../../src/services/ga4DataClient";
import { setPluginConfig } from "../../src/config";
import { makePayloadRequest } from "../../__fixtures__/http/payloadRequest";
import leadActions from "../../__fixtures__/ga4/leadActions.batch.json";
import withoutMetric from "../../__fixtures__/ga4/leadActions.batch.noElapsedMs.json";
import type { AnalyticsPluginConfig } from "../../src/types/config";

const cfg = { ga4: { propertyId: "12345", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } } } as AnalyticsPluginConfig;

beforeEach(() => {
  // getLeadActions reads the lead-action allowlist from getPluginConfig(); seed it.
  setPluginConfig(cfg);
});

function callHandler(ep: { handler: unknown }, req: unknown): Promise<Response> {
  return (ep.handler as (r: unknown) => Promise<Response>)(req);
}

describe("POST /api/analytics/lead-actions", () => {
  it("returns 403 when unauthenticated", async () => {
    const ep = buildLeadActionsEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: null, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when body fails Zod", async () => {
    const ep = buildLeadActionsEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with response when valid", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([leadActions]) };
    __setGa4ClientForTests(fake as never);
    const ep = buildLeadActionsEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.current).toBeDefined();
    expect(json.current.totals).toBeDefined();
  });

  it("returns 429 when GA4 throws RESOURCE_EXHAUSTED", async () => {
    const err = new Error("8 RESOURCE_EXHAUSTED: quota");
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockRejectedValue(err) };
    __setGa4ClientForTests(fake as never);
    const ep = buildLeadActionsEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(429);
  });

  it("returns 200 with avgTimeToAction:null + missing on unregistered fr_elapsed_ms", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field averageCustomEvent:fr_elapsed_ms is unrecognized.");
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn()
        .mockRejectedValueOnce(err)
        .mockResolvedValueOnce([withoutMetric]),
    };
    __setGa4ClientForTests(fake as never);
    const ep = buildLeadActionsEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.current.avgTimeToAction).toBeNull();
    expect(json.missing).toEqual(["fr_elapsed_ms"]);
  });
});
