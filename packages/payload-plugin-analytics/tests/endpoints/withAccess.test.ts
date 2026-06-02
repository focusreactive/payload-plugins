import { describe, expect, it, vi } from "vitest";
import { withAccess } from "../../src/endpoints/withAccess";
import { makePayloadRequest } from "../../__fixtures__/http/payloadRequest";
import type { AnalyticsPluginConfig } from "../../src/types/config";

const cfg = { ga4: { propertyId: "1", measurementId: "G-X", serviceAccount: { clientEmail: "x", privateKey: "y" } } } as AnalyticsPluginConfig;

describe("withAccess", () => {
  it("returns 403 when default access denies (no user)", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const wrapped = withAccess(cfg, handler);
    const res = await wrapped(makePayloadRequest({ user: null }));
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it("calls inner handler when access allows", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const wrapped = withAccess(cfg, handler);
    const res = await wrapped(makePayloadRequest({ user: { id: "u" } }));
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it("respects custom config.access predicate", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const wrapped = withAccess({ ...cfg, access: async () => false }, handler);
    const res = await wrapped(makePayloadRequest({ user: { id: "u" } }));
    expect(res.status).toBe(403);
  });
});
