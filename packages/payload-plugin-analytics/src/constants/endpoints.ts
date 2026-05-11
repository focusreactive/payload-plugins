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
} as const;

export type AnalyticsEndpointKey = keyof typeof ANALYTICS_ENDPOINT_PATHS;
