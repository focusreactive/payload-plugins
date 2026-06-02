import type { Config } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsPlugin } from "../src/plugin";
import type { AnalyticsPluginConfig } from "../src/types/config";

const validConfig: AnalyticsPluginConfig = {
  ga4: {
    measurementId: "G-ABC123",
    propertyId: "12345",
    serviceAccount: { clientEmail: "x@x.iam.gserviceaccount.com", privateKey: "pk" },
  },
};

const incoming = {} as Config;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("analyticsPlugin", () => {
  it("happy path — adds 10 endpoints to incoming config", () => {
    const out = analyticsPlugin(validConfig)(incoming);
    expect(out).not.toBe(incoming);
    expect(out.endpoints?.length).toBe(10);
  });

  it("disabled — short-circuits with no validation", () => {
    const out = analyticsPlugin({ disabled: true } as AnalyticsPluginConfig)(incoming);
    expect(out).toBe(incoming);
  });

  it("throws on invalid measurementId regex", () => {
    expect(() =>
      analyticsPlugin({
        ...validConfig,
        ga4: { ...validConfig.ga4, measurementId: "invalid" },
      })(incoming)
    ).toThrow(/measurementId must match/u);
  });

  it("throws on missing propertyId", () => {
    expect(() =>
      analyticsPlugin({
        ...validConfig,
        ga4: { ...validConfig.ga4, propertyId: "" },
      })(incoming)
    ).toThrow(/propertyId is required/u);
  });

  it("warns on missing serviceAccount fields but does not throw", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    analyticsPlugin({
      ...validConfig,
      ga4: { ...validConfig.ga4, serviceAccount: { clientEmail: "", privateKey: "" } },
    })(incoming);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("serviceAccount"));
  });

  it("throws when ga4 is missing entirely (and disabled is not set)", () => {
    expect(() => analyticsPlugin({} as AnalyticsPluginConfig)(incoming)).toThrow(/ga4 is required/u);
  });
});

describe("analyticsPlugin endpoint registration", () => {
  it("registers all 10 endpoints with correct paths and POST method", () => {
    const out = analyticsPlugin(validConfig)({ admin: {}, collections: [], endpoints: [] } as Config);
    expect(out.endpoints).toHaveLength(10);
    expect(out.endpoints?.map((e) => e.path).sort()).toEqual([
      "/analytics/journeys",
      "/analytics/kpis",
      "/analytics/lead-actions",
      "/analytics/sessions",
      "/analytics/sessions/:id",
      "/analytics/top-countries",
      "/analytics/top-devices",
      "/analytics/top-events",
      "/analytics/top-pages",
      "/analytics/top-sources",
    ]);
    for (const e of out.endpoints ?? []) expect(e.method).toBe("post");
  });

  it("preserves existing endpoints in incomingConfig", () => {
    const incomingWithEndpoint = {
      endpoints: [{ path: "/keep", method: "get", handler: async () => Response.json({}) }],
    } as unknown as Config;
    const out = analyticsPlugin(validConfig)(incomingWithEndpoint);
    expect(out.endpoints?.[0]?.path).toBe("/keep");
    expect(out.endpoints?.length).toBe(11);
  });

  it("returns incoming config unchanged when disabled", () => {
    const incomingEmpty = { endpoints: [] } as Config;
    expect(analyticsPlugin({ disabled: true, ga4: validConfig.ga4 })(incomingEmpty)).toBe(incomingEmpty);
  });

  it("registers /admin/analytics view", () => {
    const result = analyticsPlugin(validConfig)({} as Config);
    expect((result as any).admin.components.views.analytics.path).toBe("/analytics");
  });

  it("registers leadActions.adminRegistry into admin.components.providers", () => {
    const result = analyticsPlugin({
      ...validConfig,
      leadActions: { adminRegistry: "@/lead-actions-admin#default" },
    })({} as Config);
    expect(result.admin?.components?.providers).toContain("@/lead-actions-admin#default");
  });

  it("does not add a provider when leadActions.adminRegistry is unset", () => {
    const result = analyticsPlugin(validConfig)({} as Config);
    expect(result.admin?.components?.providers ?? []).not.toContain("@/lead-actions-admin#default");
  });
});
