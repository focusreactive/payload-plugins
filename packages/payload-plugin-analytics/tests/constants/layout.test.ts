import { describe, expect, it } from "vitest";
import { BUILTIN_TAB_IDS, BUILTIN_OVERVIEW_ROW_IDS, BUILTIN_LEAD_ACTIONS_ROW_IDS, BUILTIN_OVERVIEW_BLOCK_IDS, BUILTIN_LEAD_ACTIONS_BLOCK_IDS } from "../../src/constants/layout";

describe("layout constants", () => {
  it("lists 3 tabs", () => {
    expect(BUILTIN_TAB_IDS).toEqual(["overview", "lead-actions", "sessions"]);
  });

  it("lists 4 overview rows", () => {
    expect(BUILTIN_OVERVIEW_ROW_IDS).toEqual(["kpi-row", "trend-row", "top-row", "devices-countries-row"]);
  });

  it("lists 4 lead-actions rows", () => {
    expect(BUILTIN_LEAD_ACTIONS_ROW_IDS).toEqual(["kpi-row", "by-type-row", "per-page-row", "journeys-row"]);
  });

  it("lists 11 overview blocks", () => {
    expect(BUILTIN_OVERVIEW_BLOCK_IDS).toEqual([
      "sessions-kpi",
      "users-kpi",
      "pageviews-kpi",
      "bounce-rate-kpi",
      "avg-duration-kpi",
      "trend-chart",
      "top-pages",
      "top-sources",
      "top-events",
      "devices-donut",
      "top-countries",
    ]);
  });

  it("lists 6 lead-actions blocks", () => {
    expect(BUILTIN_LEAD_ACTIONS_BLOCK_IDS).toEqual(["total-leads-kpi", "conversion-rate-kpi", "avg-time-kpi", "lead-actions-by-type", "per-page-breakdown", "discovery-paths"]);
  });
});
