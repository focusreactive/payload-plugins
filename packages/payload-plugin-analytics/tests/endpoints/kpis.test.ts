import { describe, expect, it, vi } from "vitest";
import { buildKpisEndpoint } from "../../src/endpoints/kpis";
import { __setGa4ClientForTests } from "../../src/services/ga4DataClient";
import { makePayloadRequest } from "../../__fixtures__/http/payloadRequest";
import kpisCurrent from "../../__fixtures__/ga4/kpis.current.json";
import type { AnalyticsPluginConfig } from "../../src/types/config";

const cfg = { ga4: { propertyId: "12345", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } } } as AnalyticsPluginConfig;

function callHandler(ep: { handler: unknown }, req: unknown): Promise<Response> {
  // PayloadHandler signature accepts extra positional args (request, args). For tests we only need req.
  return (ep.handler as (r: unknown) => Promise<Response>)(req);
}

describe("POST /api/analytics/kpis", () => {
  it("returns 403 when unauthenticated", async () => {
    const ep = buildKpisEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: null, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when body fails Zod", async () => {
    const ep = buildKpisEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with KpiResponse when valid", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([kpisCurrent]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const ep = buildKpisEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.current.sessions).toBe("number");
  });

  it("returns 429 when GA4 throws RESOURCE_EXHAUSTED", async () => {
    const err = new Error("8 RESOURCE_EXHAUSTED: quota");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const ep = buildKpisEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } }));
    expect(res.status).toBe(429);
  });
});
