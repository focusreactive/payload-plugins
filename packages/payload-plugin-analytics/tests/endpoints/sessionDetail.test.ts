import { describe, expect, it, vi } from "vitest";
import { buildSessionDetailEndpoint } from "../../src/endpoints/sessionDetail";
import { __setGa4ClientForTests } from "../../src/services/ga4DataClient";
import { encodeSessionId } from "../../src/utils/ga4";
import { makePayloadRequest } from "../../__fixtures__/http/payloadRequest";
import sessionDetail from "../../__fixtures__/ga4/sessionDetail.json";
import type { AnalyticsPluginConfig } from "../../src/types/config";

const cfg = { ga4: { propertyId: "12345", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } } } as AnalyticsPluginConfig;

function callHandler(ep: { handler: unknown }, req: unknown): Promise<Response> {
  return (ep.handler as (r: unknown) => Promise<Response>)(req);
}

const SESSION_ID = encodeSessionId({
  dhm: "202605101430",
  src: "google",
  dev: "desktop",
  ctr: "United States",
  lp: "/",
});

describe("POST /api/analytics/sessions/:id", () => {
  it("returns 403 when unauthenticated", async () => {
    const ep = buildSessionDetailEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: null, body: { dateRange: { preset: "last-7d" } }, routeParams: { id: SESSION_ID } }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when sessionId missing in path", async () => {
    const ep = buildSessionDetailEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } } }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(typeof json.error).toBe("string");
  });

  it("returns 400 when body fails Zod", async () => {
    const ep = buildSessionDetailEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: { id: "u" }, body: {}, routeParams: { id: SESSION_ID } }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when sessionId is malformed/un-decodable", async () => {
    const ep = buildSessionDetailEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({
        user: { id: "u" },
        body: { dateRange: { preset: "last-7d" } },
        routeParams: { id: "not-a-valid-id" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with sessionId + events when valid", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const ep = buildSessionDetailEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } }, routeParams: { id: SESSION_ID } }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sessionId).toBe(SESSION_ID);
    expect(Array.isArray(json.events)).toBe(true);
  });

  it("returns 429 when GA4 throws RESOURCE_EXHAUSTED", async () => {
    const err = new Error("8 RESOURCE_EXHAUSTED: quota");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const ep = buildSessionDetailEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } }, routeParams: { id: SESSION_ID } }),
    );
    expect(res.status).toBe(429);
  });

  it("returns 400 when GA4 throws INVALID_ARGUMENT", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad filter");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const ep = buildSessionDetailEndpoint(cfg);
    const res = await callHandler(
      ep,
      makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "last-7d" } }, routeParams: { id: SESSION_ID } }),
    );
    expect(res.status).toBe(400);
  });
});
