import type { TabId } from "../types/layout";

export const BUILTIN_TAB_IDS = ["overview", "lead-actions", "sessions"] as const satisfies readonly TabId[];

export const BUILTIN_OVERVIEW_ROW_IDS = ["kpi-row", "trend-row", "top-row", "devices-countries-row"] as const;

export const BUILTIN_LEAD_ACTIONS_ROW_IDS = ["kpi-row", "by-type-row", "per-page-row", "journeys-row"] as const;

export const BUILTIN_OVERVIEW_BLOCK_IDS = [
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
] as const;

export const BUILTIN_LEAD_ACTIONS_BLOCK_IDS = [
  "total-leads-kpi",
  "conversion-rate-kpi",
  "avg-time-kpi",
  "lead-actions-by-type",
  "per-page-breakdown",
  "discovery-paths",
] as const;

export type BuiltinOverviewBlockId = (typeof BUILTIN_OVERVIEW_BLOCK_IDS)[number];
export type BuiltinLeadActionsBlockId = (typeof BUILTIN_LEAD_ACTIONS_BLOCK_IDS)[number];
export type BuiltinBlockId = BuiltinOverviewBlockId | BuiltinLeadActionsBlockId;
