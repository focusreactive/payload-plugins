import { describe, expect, it } from "vitest";
import { validateResolvedLayout } from "../../../src/services/layout/validateLayout";
import type { AnalyticsLayoutConfig, BlockDefinition } from "../../../src/types/layout";

const REGISTRY: Record<string, BlockDefinition> = {
  "a-block": { component: "x" },
  "b-block": { component: "x" },
};

function mkLayout(overrides: Partial<AnalyticsLayoutConfig> = {}): AnalyticsLayoutConfig {
  return {
    tabs: {
      overview: {
        rows: {
          row1: {
            order: 1,
            columns: 2,
            blocks: { "a-block": { order: 1, colSpan: 1 }, "b-block": { order: 2, colSpan: 1 } },
          },
        },
      },
    },
    ...overrides,
  };
}

describe("validateResolvedLayout", () => {
  it("passes for valid input", () => {
    expect(() => validateResolvedLayout(mkLayout(), REGISTRY)).not.toThrow();
  });

  it("throws on unknown block ID", () => {
    const layout = mkLayout();
    (layout.tabs.overview!.rows["row1"].blocks as Record<string, unknown>)["ghost"] = {
      order: 9,
      colSpan: 1,
    };
    expect(() => validateResolvedLayout(layout, REGISTRY)).toThrow(/unknown block.*"ghost"/iu);
  });

  it("throws on duplicate block order within a row", () => {
    const layout = mkLayout();
    layout.tabs.overview!.rows["row1"].blocks["b-block"].order = 1;
    expect(() => validateResolvedLayout(layout, REGISTRY)).toThrow(/duplicate.*order.*1/iu);
  });

  it("throws on duplicate row order within a tab", () => {
    const layout = mkLayout();
    layout.tabs.overview!.rows["row2"] = { order: 1, columns: 2, blocks: {} };
    expect(() => validateResolvedLayout(layout, REGISTRY)).toThrow(/duplicate.*row.*order.*1/iu);
  });

  it("throws on the same block ID in two rows of one tab", () => {
    const layout = mkLayout();
    layout.tabs.overview!.rows["row2"] = {
      order: 2,
      columns: 1,
      blocks: { "a-block": { order: 1, colSpan: 1 } },
    };
    expect(() => validateResolvedLayout(layout, REGISTRY)).toThrow(/"a-block".*multiple rows/iu);
  });

  it("throws on non-integer colSpan", () => {
    const layout = mkLayout();
    layout.tabs.overview!.rows["row1"].blocks["a-block"].colSpan = 2.4;
    expect(() => validateResolvedLayout(layout, REGISTRY)).toThrow(/colSpan.*integer/iu);
  });

  it("throws on colSpan ≤ 0", () => {
    const layout = mkLayout();
    layout.tabs.overview!.rows["row1"].blocks["a-block"].colSpan = 0;
    expect(() => validateResolvedLayout(layout, REGISTRY)).toThrow(/colSpan.*positive/iu);
  });

  it("throws on columns ≤ 0", () => {
    const layout = mkLayout();
    layout.tabs.overview!.rows["row1"].columns = 0;
    expect(() => validateResolvedLayout(layout, REGISTRY)).toThrow(/columns.*positive/iu);
  });

  it("skips disabled rows and their content during validation of duplicate block IDs", () => {
    const layout = mkLayout();
    layout.tabs.overview!.rows["row2"] = {
      order: 2,
      columns: 1,
      enabled: false,
      blocks: { "a-block": { order: 1, colSpan: 1 } },
    };
    expect(() => validateResolvedLayout(layout, REGISTRY)).not.toThrow();
  });

  it("skips disabled blocks for unknown-block checks", () => {
    const layout = mkLayout();
    (layout.tabs.overview!.rows["row1"].blocks as Record<string, unknown>)["ghost"] = {
      order: 9,
      colSpan: 1,
      enabled: false,
    };
    expect(() => validateResolvedLayout(layout, REGISTRY)).not.toThrow();
  });
});
