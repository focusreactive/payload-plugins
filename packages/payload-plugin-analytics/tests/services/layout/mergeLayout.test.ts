import { describe, expect, it } from "vitest";
import { mergeLayout, mergeBlockRegistry } from "../../../src/services/layout/mergeLayout";
import type { AnalyticsLayoutConfig, BlockDefinition } from "../../../src/types/layout";

describe("mergeLayout", () => {
  const defaults: AnalyticsLayoutConfig = {
    tabs: {
      overview: {
        rows: {
          "kpi-row": {
            order: 1,
            columns: 5,
            blocks: {
              "sessions-kpi": { order: 1, colSpan: 1 },
              "users-kpi": { order: 2, colSpan: 1 },
            },
          },
        },
      },
    },
  };

  it("returns defaults when user config is undefined", () => {
    expect(mergeLayout(undefined, defaults)).toEqual(defaults);
  });

  it("deep-merges a block placement override", () => {
    const merged = mergeLayout(
      {
        tabs: {
          overview: { rows: { "kpi-row": { blocks: { "sessions-kpi": { colSpan: 2 } } } } },
        },
      } as unknown as AnalyticsLayoutConfig,
      defaults
    );

    expect(merged.tabs.overview?.rows["kpi-row"].blocks["sessions-kpi"]).toEqual({
      order: 1,
      colSpan: 2,
    });
    expect(merged.tabs.overview?.rows["kpi-row"].blocks["users-kpi"]).toEqual({
      order: 2,
      colSpan: 1,
    });
  });

  it("preserves the row's columns when only blocks are overridden", () => {
    const merged = mergeLayout(
      {
        tabs: {
          overview: { rows: { "kpi-row": { blocks: { "sessions-kpi": { colSpan: 3 } } } } },
        },
      } as unknown as AnalyticsLayoutConfig,
      defaults
    );
    expect(merged.tabs.overview?.rows["kpi-row"].columns).toBe(5);
  });

  it("respects enabled: false on a block", () => {
    const merged = mergeLayout(
      {
        tabs: {
          overview: { rows: { "kpi-row": { blocks: { "sessions-kpi": { enabled: false } } } } },
        },
      } as unknown as AnalyticsLayoutConfig,
      defaults
    );
    expect(merged.tabs.overview?.rows["kpi-row"].blocks["sessions-kpi"].enabled).toBe(false);
  });

  it("adds a user-defined row to a default tab", () => {
    const merged = mergeLayout(
      {
        tabs: {
          overview: {
            rows: {
              "my-row": {
                order: 100,
                columns: 2,
                blocks: { "my-block": { order: 1, colSpan: 1 } },
              },
            },
          },
        },
      },
      defaults
    );
    expect(merged.tabs.overview?.rows["my-row"].order).toBe(100);
    expect(merged.tabs.overview?.rows["kpi-row"]).toBeDefined();
  });

  it("passes through sessionsTabComponent override", () => {
    const merged = mergeLayout({ tabs: {}, sessionsTabComponent: "my-app/MySessions" }, defaults);
    expect(merged.sessionsTabComponent).toBe("my-app/MySessions");
  });
});

describe("mergeBlockRegistry", () => {
  const defaults: Record<string, BlockDefinition> = {
    "sessions-kpi": { component: "blocks/SessionsKpiBlock" },
  };

  it("returns defaults when user registry is undefined", () => {
    expect(mergeBlockRegistry(undefined, defaults)).toEqual(defaults);
  });

  it("deep-merges component override while preserving fetch", () => {
    const defaultsWithFetch: Record<string, BlockDefinition> = {
      x: { component: "default/X", fetch: async () => ({ a: 1 }) },
    };
    const merged = mergeBlockRegistry({ x: { component: "user/X" } }, defaultsWithFetch);
    expect(merged.x.component).toBe("user/X");
    expect(merged.x.fetch).toBe(defaultsWithFetch.x.fetch);
  });

  it("adds new user-defined blocks", () => {
    const merged = mergeBlockRegistry(
      { "my-block": { component: "user/MyBlock", fetch: async () => ({}) } },
      defaults
    );
    expect(merged["my-block"]).toBeDefined();
    expect(merged["sessions-kpi"]).toBeDefined();
  });
});
