import { describe, expect, it, vi, afterEach } from "vitest";
import { buildCustomBlockEndpoint } from "../../src/endpoints/customBlock";
import { __resetGa4Client, __setGa4ClientForTests } from "../../src/services/ga4DataClient";
import { makePayloadRequest } from "../../__fixtures__/http/payloadRequest";
import type { AnalyticsPluginConfig } from "../../src/types/config";
import type { BlockDefinition } from "../../src/types/layout";

afterEach(() => __resetGa4Client());

const baseConfig: AnalyticsPluginConfig = {
  ga4: {
    propertyId: "123",
    measurementId: "G-X",
    serviceAccount: { clientEmail: "x", privateKey: "x" },
  },
};

function callHandler(ep: { handler: unknown }, req: unknown): Promise<Response> {
  return (ep.handler as (r: unknown) => Promise<Response>)(req);
}

describe("buildCustomBlockEndpoint", () => {
  it("invokes the block fetch with dateRange + comparison + ga4 + req and returns the result", async () => {
    __setGa4ClientForTests({ runReport: vi.fn().mockResolvedValue([{}, null, null]), batchRunReports: vi.fn() });

    const fetchFn = vi.fn().mockResolvedValue({ value: 42 });
    const def: BlockDefinition = { component: "x", fetch: fetchFn };
    const ep = buildCustomBlockEndpoint(baseConfig, "my-block", def);

    const req = makePayloadRequest({
      user: { id: "u" },
      body: { dateRange: { preset: "last-14d" }, comparison: { kind: "none" } },
    });

    const res = await callHandler(ep, req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ value: 42 });

    const args = fetchFn.mock.calls[0][0];
    expect(args.dateRange).toEqual({ preset: "last-14d" });
    expect(args.comparison).toEqual({ kind: "none" });
    expect(typeof args.ga4.runReport).toBe("function");
    expect(args.req).toBe(req);
  });

  it("returns 400 on invalid body", async () => {
    const def: BlockDefinition = { component: "x", fetch: vi.fn() };
    const ep = buildCustomBlockEndpoint(baseConfig, "my-block", def);
    const req = makePayloadRequest({ user: { id: "u" }, body: { dateRange: { preset: "nope" } } });

    const res = await callHandler(ep, req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on fetch throw", async () => {
    __setGa4ClientForTests({ runReport: vi.fn(), batchRunReports: vi.fn() });
    const def: BlockDefinition = {
      component: "x",
      fetch: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const ep = buildCustomBlockEndpoint(baseConfig, "my-block", def);
    const req = makePayloadRequest({
      user: { id: "u" },
      body: { dateRange: { preset: "last-14d" }, comparison: { kind: "none" } },
    });

    const res = await callHandler(ep, req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("boom");
  });

  it("returns 500 with helpful message if the definition has no fetch", async () => {
    const def: BlockDefinition = { component: "x" };
    const ep = buildCustomBlockEndpoint(baseConfig, "my-block", def);
    const req = makePayloadRequest({
      user: { id: "u" },
      body: { dateRange: { preset: "last-14d" }, comparison: { kind: "none" } },
    });

    const res = await callHandler(ep, req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/no fetch/iu);
  });
});
