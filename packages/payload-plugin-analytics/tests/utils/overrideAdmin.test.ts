import { describe, expect, it } from "vitest";
import { overrideAdmin } from "../../src/utils/config/overrideAdmin";

describe("overrideAdmin", () => {
  it("registers an analytics view under admin.components.views and a nav link", () => {
    const incoming = {} as any;
    const next = overrideAdmin(incoming);
    expect(next.admin?.components?.views?.analytics?.path).toBe("/analytics");
    expect(next.admin?.components?.views?.analytics?.Component).toContain(
      "@focus-reactive/payload-plugin-analytics/components/AnalyticsView",
    );
    expect(next.admin?.components?.beforeNavLinks?.length ?? 0).toBeGreaterThan(0);
  });

  it("preserves existing views and nav links", () => {
    const incoming: any = {
      admin: {
        components: {
          views: { dashboard: { Component: "x", path: "/dashboard" } },
          beforeNavLinks: ["existing"],
        },
      },
    };
    const next = overrideAdmin(incoming);
    expect(next.admin.components.views.dashboard).toBeDefined();
    expect(next.admin.components.views.analytics).toBeDefined();
    expect(next.admin.components.beforeNavLinks.length).toBe(2);
  });
});
