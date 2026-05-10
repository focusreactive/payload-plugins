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
  it("happy path — returns incoming config unchanged", () => {
    const out = analyticsPlugin(validConfig)(incoming);
    expect(out).toBe(incoming);
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
      })(incoming),
    ).toThrow(/measurementId must match/);
  });

  it("throws on missing propertyId", () => {
    expect(() =>
      analyticsPlugin({
        ...validConfig,
        ga4: { ...validConfig.ga4, propertyId: "" },
      })(incoming),
    ).toThrow(/propertyId is required/);
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
    expect(() => analyticsPlugin({} as AnalyticsPluginConfig)(incoming)).toThrow(/ga4 is required/);
  });
});
