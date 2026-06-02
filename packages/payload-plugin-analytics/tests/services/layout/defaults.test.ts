import { describe, expect, it } from "vitest";
import { getDefaultBlockRegistry, getDefaultLayout } from "../../../src/services/layout/defaults";
import { BUILTIN_OVERVIEW_BLOCK_IDS, BUILTIN_LEAD_ACTIONS_BLOCK_IDS } from "../../../src/constants/layout";

describe("default block registry", () => {
  const reg = getDefaultBlockRegistry();

  it("has an entry for every built-in overview block", () => {
    for (const id of BUILTIN_OVERVIEW_BLOCK_IDS) {
      expect(reg[id]).toBeDefined();
      expect(reg[id].component).toMatch(/^@focus-reactive\/payload-plugin-analytics\/components\/AnalyticsView\/blocks\//u);
    }
  });

  it("has an entry for every built-in lead-actions block", () => {
    for (const id of BUILTIN_LEAD_ACTIONS_BLOCK_IDS) {
      expect(reg[id]).toBeDefined();
    }
  });

  it("does not define a fetch field for built-ins (built-ins manage their own data)", () => {
    for (const id of BUILTIN_OVERVIEW_BLOCK_IDS) {
      expect(reg[id].fetch).toBeUndefined();
    }
  });
});

describe("default layout", () => {
  const layout = getDefaultLayout();

  it("has overview and lead-actions tabs", () => {
    expect(layout.tabs.overview).toBeDefined();
    expect(layout.tabs["lead-actions"]).toBeDefined();
  });

  it("overview has 4 rows", () => {
    expect(Object.keys(layout.tabs.overview!.rows)).toHaveLength(4);
  });

  it("kpi-row in overview has 5 columns and 5 blocks", () => {
    const row = layout.tabs.overview!.rows["kpi-row"];
    expect(row.columns).toBe(5);
    expect(Object.keys(row.blocks)).toHaveLength(5);
  });

  it("devices-countries-row uses colSpan 1 and 2 in a 3-column row", () => {
    const row = layout.tabs.overview!.rows["devices-countries-row"];
    expect(row.columns).toBe(3);
    expect(row.blocks["devices-donut"].colSpan).toBe(1);
    expect(row.blocks["top-countries"].colSpan).toBe(2);
  });

  it("lead-actions kpi-row has 3 columns and 3 blocks", () => {
    const row = layout.tabs["lead-actions"]!.rows["kpi-row"];
    expect(row.columns).toBe(3);
    expect(Object.keys(row.blocks)).toHaveLength(3);
  });
});
