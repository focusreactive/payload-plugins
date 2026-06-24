import { describe, expect, it } from "vitest";
import { resolveLayout } from "../../../src/services/layout/resolveLayout";
import type { AnalyticsPluginConfig } from "../../../src/types/config";

const BASE_CONFIG = {
  ga4: {
    propertyId: "1",
    measurementId: "G-X",
    serviceAccount: { clientEmail: "x", privateKey: "x" },
  },
} as AnalyticsPluginConfig;

describe("resolveLayout", () => {
  it("returns default layout when no overrides", () => {
    const { layout, registry } = resolveLayout(BASE_CONFIG);
    expect(layout.tabs.overview?.rows["kpi-row"].columns).toBe(5);
    expect(registry["sessions-kpi"]).toBeDefined();
  });

  it("returns sorted resolved tabs by row order", () => {
    const { resolved } = resolveLayout(BASE_CONFIG);
    const overview = resolved.tabs.find((t) => t.id === "overview")!;
    expect(overview.rows.map((r) => r.id)).toEqual([
      "kpi-row",
      "trend-row",
      "top-row",
      "devices-countries-row",
    ]);
  });

  it("excludes disabled rows from resolved output", () => {
    const { resolved } = resolveLayout({
      ...BASE_CONFIG,
      layout: {
        tabs: { overview: { rows: { "kpi-row": { enabled: false } } } },
      } as AnalyticsPluginConfig["layout"],
    });
    const overview = resolved.tabs.find((t) => t.id === "overview")!;
    expect(overview.rows.find((r) => r.id === "kpi-row")).toBeUndefined();
  });

  it("excludes disabled blocks from resolved output", () => {
    const { resolved } = resolveLayout({
      ...BASE_CONFIG,
      layout: {
        tabs: {
          overview: { rows: { "kpi-row": { blocks: { "sessions-kpi": { enabled: false } } } } },
        },
      } as AnalyticsPluginConfig["layout"],
    });
    const overview = resolved.tabs.find((t) => t.id === "overview")!;
    const kpiRow = overview.rows.find((r) => r.id === "kpi-row")!;
    expect(kpiRow.blocks.find((b) => b.id === "sessions-kpi")).toBeUndefined();
  });

  it("throws when validation fails", () => {
    expect(() =>
      resolveLayout({
        ...BASE_CONFIG,
        layout: {
          tabs: {
            overview: {
              rows: {
                "user-row": {
                  order: 99,
                  columns: 1,
                  blocks: { "ghost-block": { order: 1, colSpan: 1 } },
                },
              },
            },
          },
        } as AnalyticsPluginConfig["layout"],
      })
    ).toThrow(/unknown block.*ghost-block/iu);
  });

  it("includes user-defined block in registry and layout", () => {
    const { registry, resolved } = resolveLayout({
      ...BASE_CONFIG,
      blocks: { "my-block": { component: "app/MyBlock" } },
      layout: {
        tabs: {
          overview: {
            rows: {
              "my-row": {
                order: 100,
                columns: 1,
                blocks: { "my-block": { order: 1, colSpan: 1 } },
              },
            },
          },
        },
      } as AnalyticsPluginConfig["layout"],
    });
    expect(registry["my-block"]).toBeDefined();
    const overview = resolved.tabs.find((t) => t.id === "overview")!;
    const myRow = overview.rows.find((r) => r.id === "my-row")!;
    expect(myRow.blocks.find((b) => b.id === "my-block")).toBeDefined();
  });
});
