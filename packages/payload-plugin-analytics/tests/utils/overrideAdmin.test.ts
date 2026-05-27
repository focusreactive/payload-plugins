import { describe, expect, it } from "vitest";
import { overrideAdmin } from "../../src/utils/config/overrideAdmin";
import type { Config } from "payload";

describe("overrideAdmin", () => {
  it("registers an analytics view under admin.components.views and a nav link", () => {
    const incoming = {} as Config;
    const next = overrideAdmin(incoming);
    expect(next.admin?.components?.views?.analytics).toBeDefined();
    const analyticsView = next.admin?.components?.views?.analytics as { path?: string; Component?: string };
    expect(analyticsView.path).toBe("/analytics");
    expect(analyticsView.Component).toContain(
      "@focus-reactive/payload-plugin-analytics/components/AnalyticsView",
    );
  });

  it("preserves existing views and actions", () => {
    const incoming = {
      admin: {
        components: {
          views: { dashboard: { Component: "x", path: "/dashboard" } },
          actions: ["existing"],
        },
      },
    } as unknown as Config;
    const next = overrideAdmin(incoming);
    expect(next.admin?.components?.views?.dashboard).toBeDefined();
    expect(next.admin?.components?.views?.analytics).toBeDefined();
    expect(next.admin?.components?.actions?.length).toBe(2);
  });
});

describe("overrideAdmin with leadActions.adminRegistry", () => {
  it("pushes adminRegistry path into admin.components.providers", () => {
    const incoming = { admin: { components: { providers: ["already-here"] } } } as unknown as Config;
    const out = overrideAdmin(incoming, { adminRegistry: "@/lead-actions-admin#default" });
    expect(out.admin?.components?.providers).toContain("@/lead-actions-admin#default");
    expect(out.admin?.components?.providers).toContain("already-here");
  });

  it("creates the providers array when none exists", () => {
    const incoming = { admin: { components: {} } } as unknown as Config;
    const out = overrideAdmin(incoming, { adminRegistry: "@/lead-actions-admin#default" });
    expect(out.admin?.components?.providers).toEqual(["@/lead-actions-admin#default"]);
  });

  it("does not modify providers when adminRegistry is undefined", () => {
    const incoming = { admin: { components: { providers: ["a"] } } } as unknown as Config;
    const out = overrideAdmin(incoming, {});
    expect(out.admin?.components?.providers).toEqual(["a"]);
  });
});
