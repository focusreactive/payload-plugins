import { describe, expect, it, vi } from "vitest";
import { resolveAccess } from "../../../src/services/access/resolveAccess";
import type { AnalyticsPluginConfig } from "../../../src/types/config";
import type { PayloadRequest } from "payload";

const baseCfg = {
  ga4: {
    propertyId: "1",
    measurementId: "G-X",
    serviceAccount: { clientEmail: "x", privateKey: "y" },
  },
} as AnalyticsPluginConfig;

describe("resolveAccess", () => {
  it("default predicate returns true for authenticated req", async () => {
    const req = { user: { id: "u1" } } as unknown as PayloadRequest;
    await expect(resolveAccess(baseCfg, req)).resolves.toBe(true);
  });
  it("default predicate returns false for unauthenticated req", async () => {
    const req = { user: null } as unknown as PayloadRequest;
    await expect(resolveAccess(baseCfg, req)).resolves.toBe(false);
  });
  it("uses config.access when provided", async () => {
    const fn = vi.fn().mockResolvedValue(true);
    const cfg = { ...baseCfg, access: fn };
    const req = { user: null } as unknown as PayloadRequest;
    await expect(resolveAccess(cfg, req)).resolves.toBe(true);
    expect(fn).toHaveBeenCalledWith({ req });
  });
});
