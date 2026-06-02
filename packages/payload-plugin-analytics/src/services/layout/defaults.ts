import { getComponentPath } from "../../utils/path/getComponentPath";
import type { AnalyticsLayoutConfig, BlockDefinition, BlockId } from "../../types/layout";

function builtIn(componentName: string) {
  return getComponentPath(`components/AnalyticsView/blocks/${componentName}`, componentName);
}

export function getDefaultBlockRegistry(): Record<BlockId, BlockDefinition> {
  return {
    "sessions-kpi": { component: builtIn("SessionsKpiBlock") },
    "users-kpi": { component: builtIn("UsersKpiBlock") },
    "pageviews-kpi": { component: builtIn("PageviewsKpiBlock") },
    "bounce-rate-kpi": { component: builtIn("BounceRateKpiBlock") },
    "avg-duration-kpi": { component: builtIn("AvgDurationKpiBlock") },
    "trend-chart": { component: builtIn("TrendChartBlock") },
    "top-pages": { component: builtIn("TopPagesBlock") },
    "top-sources": { component: builtIn("TopSourcesBlock") },
    "top-events": { component: builtIn("TopEventsBlock") },
    "devices-donut": { component: builtIn("DevicesDonutBlock") },
    "top-countries": { component: builtIn("TopCountriesBlock") },
    "total-leads-kpi": { component: builtIn("TotalLeadsKpiBlock") },
    "conversion-rate-kpi": { component: builtIn("ConversionRateKpiBlock") },
    "avg-time-kpi": { component: builtIn("AvgTimeKpiBlock") },
    "lead-actions-by-type": { component: builtIn("LeadActionsByTypeBlock") },
    "per-page-breakdown": { component: builtIn("PerPageBreakdownBlock") },
    "discovery-paths": { component: builtIn("DiscoveryPathsBlock") },
  };
}

export function getDefaultLayout(): AnalyticsLayoutConfig {
  return {
    tabs: {
      overview: {
        rows: {
          "kpi-row": {
            order: 1,
            columns: 5,
            blocks: {
              "sessions-kpi": { order: 1, colSpan: 1 },
              "users-kpi": { order: 2, colSpan: 1 },
              "pageviews-kpi": { order: 3, colSpan: 1 },
              "bounce-rate-kpi": { order: 4, colSpan: 1 },
              "avg-duration-kpi": { order: 5, colSpan: 1 },
            },
          },
          "trend-row": {
            order: 2,
            columns: 1,
            blocks: { "trend-chart": { order: 1, colSpan: 1 } },
          },
          "top-row": {
            order: 3,
            columns: 3,
            blocks: {
              "top-pages": { order: 1, colSpan: 1 },
              "top-sources": { order: 2, colSpan: 1 },
              "top-events": { order: 3, colSpan: 1 },
            },
          },
          "devices-countries-row": {
            order: 4,
            columns: 3,
            blocks: {
              "devices-donut": { order: 1, colSpan: 1 },
              "top-countries": { order: 2, colSpan: 2 },
            },
          },
        },
      },
      "lead-actions": {
        rows: {
          "kpi-row": {
            order: 1,
            columns: 3,
            blocks: {
              "total-leads-kpi": { order: 1, colSpan: 1 },
              "conversion-rate-kpi": { order: 2, colSpan: 1 },
              "avg-time-kpi": { order: 3, colSpan: 1 },
            },
          },
          "by-type-row": {
            order: 2,
            columns: 1,
            blocks: { "lead-actions-by-type": { order: 1, colSpan: 1 } },
          },
          "per-page-row": {
            order: 3,
            columns: 1,
            blocks: { "per-page-breakdown": { order: 1, colSpan: 1 } },
          },
          "journeys-row": {
            order: 4,
            columns: 1,
            blocks: { "discovery-paths": { order: 1, colSpan: 1 } },
          },
        },
      },
    },
  };
}
