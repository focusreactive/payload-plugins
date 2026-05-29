export const ANALYTICS_ENDPOINT_PATHS = {
  kpis: "/analytics/kpis",
  topPages: "/analytics/top-pages",
  topEvents: "/analytics/top-events",
  topSources: "/analytics/top-sources",
  topDevices: "/analytics/top-devices",
  topCountries: "/analytics/top-countries",
  leadActions: "/analytics/lead-actions",
  sessions: "/analytics/sessions",
  sessionDetail: "/analytics/sessions/:id",
  journeys: "/analytics/journeys",
  abKpis: "/analytics/ab/kpis",
  abExperimentsList: "/analytics/ab/experiments",
  abExperimentHeader: "/analytics/ab/experiment/header",
  abExperimentExposure: "/analytics/ab/experiment/exposure",
  abExperimentOutcome: "/analytics/ab/experiment/outcome",
  abExperimentTimeSeries: "/analytics/ab/experiment/timeseries",
  abExperimentLeadBreakdown: "/analytics/ab/experiment/lead-breakdown",
} as const;

export type AnalyticsEndpointKey = keyof typeof ANALYTICS_ENDPOINT_PATHS;

export function customBlockEndpointPath(blockId: string) {
  return `/analytics/custom/${blockId}`;
}
