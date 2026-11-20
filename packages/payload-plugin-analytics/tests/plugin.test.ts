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

// Without usable GA4 credentials the plugin adds no endpoints, but keeps its admin components
// registered so the generated import map does not depend on env vars.
const expectAdminComponentsOnly = (out: Config) => {
  expect(out.endpoints ?? []).toHaveLength(0);
  expect((out.admin?.components?.views as Record<string, { path?: string }>)?.analytics?.path).toBe(
    "/analytics"
  );
  expect(out.admin?.components?.actions).toEqual([
    "@focus-reactive/payload-plugin-analytics/components/AnalyticsView/AnalyticsHeaderAction#default",
  ]);
};

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

  it("warns and disables on invalid measurementId regex", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = analyticsPlugin({
      ...validConfig,
      ga4: { ...validConfig.ga4, measurementId: "invalid" },
    })(incoming);
    expectAdminComponentsOnly(out);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not a valid GA4 ID"));
  });

  it("warns and disables on missing propertyId", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = analyticsPlugin({
      ...validConfig,
      ga4: { ...validConfig.ga4, propertyId: "" },
    })(incoming);
    expectAdminComponentsOnly(out);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("propertyId is missing"));
  });

  it("warns on missing serviceAccount fields but does not throw", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = analyticsPlugin({
      ...validConfig,
      ga4: { ...validConfig.ga4, serviceAccount: { clientEmail: "", privateKey: "" } },
    })(incoming);
    expectAdminComponentsOnly(out);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("serviceAccount"));
  });

  it("warns and disables when ga4 is missing entirely (and disabled is not set)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = analyticsPlugin({} as AnalyticsPluginConfig)(incoming);
    expectAdminComponentsOnly(out);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ga4 config is missing"));
  });
});

describe("analyticsPlugin import map stability", () => {
  it("registers the same admin components with and without GA4 credentials", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const withGa4 = analyticsPlugin(validConfig)({} as Config);
    const withoutGa4 = analyticsPlugin({ ...validConfig, ga4: undefined } as never)({} as Config);
    expect(withoutGa4.admin?.components).toEqual(withGa4.admin?.components);
    expect(withoutGa4.admin?.dependencies).toEqual(withGa4.admin?.dependencies);
  });
});

describe("analyticsPlugin endpoint registration", () => {
  it("registers all 10 endpoints with correct paths and POST method", () => {
    const out = analyticsPlugin(validConfig)({
      admin: {},
      collections: [],
      endpoints: [],
    } as Config);
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
    expect(analyticsPlugin({ disabled: true, ga4: validConfig.ga4 })(incomingEmpty)).toBe(
      incomingEmpty
    );
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
