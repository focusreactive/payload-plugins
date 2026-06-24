import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTopPagesEndpoint } from "../../src/endpoints/topPages";
import { __setGa4ClientForTests } from "../../src/services/ga4DataClient";
import { setPluginConfig } from "../../src/config";
import { makePayloadRequest } from "../../__fixtures__/http/payloadRequest";
import topPages from "../../__fixtures__/ga4/topPages.json";
import type { AnalyticsPluginConfig } from "../../src/types/config";

const cfg = {
  ga4: {
    propertyId: "12345",
    measurementId: "G-X",
    serviceAccount: { clientEmail: "x", privateKey: "y" },
  },
} as AnalyticsPluginConfig;

// The handler builds a PageFilterContext via getResolvedPagesConfig() → getPluginConfig();
// seed a config with no `pages` so the resolved config is null (feature off, no filter).
beforeEach(() => {
  setPluginConfig(cfg);
});

function callHandler(ep: { handler: unknown }, req: unknown): Promise<Response> {
  return (ep.handler as (r: unknown) => Promise<Response>)(req);
}

describe("POST /api/analytics/top-pages", () => {
  it("returns 403 when unauthenticated", async () => {
    const ep = buildTopPagesEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: null, body: { dateRange: { preset: "last-7d" } } })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when body fails Zod", async () => {
    const ep = buildTopPagesEndpoint(cfg);
    const res = await callHandler(ep, makePayloadRequest({ user: { id: "u" }, body: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with rows when valid", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topPages]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const ep = buildTopPagesEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rows)).toBe(true);
  });

  it("returns 429 when GA4 throws RESOURCE_EXHAUSTED", async () => {
    const err = new Error("8 RESOURCE_EXHAUSTED: quota");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const ep = buildTopPagesEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } })
    );
    expect(res.status).toBe(429);
  });
});
