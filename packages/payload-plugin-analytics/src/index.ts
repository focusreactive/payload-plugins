export { analyticsPlugin } from "./plugin";
export { ENGAGEMENT_EVENTS, LEAD_ACTION_EVENTS, TRAFFIC_EVENTS } from "./constants/events";
export type { AccessFn, AnalyticsPluginConfig, AutoTrackLeadActionsConfig, Ga4Config } from "./types/config";
export type {
  AnalyticsEventName,
  EngagementEventName,
  LeadActionEventName,
  LeadActionKind,
  TrafficEventName,
} from "./types/events";

export type {
  AnalyticsQuery,
  DateRange,
  DateRangePreset,
  Comparison,
  TopNQuery,
  SessionsListQuery,
  KpiResponse,
  KpiCurrent,
  KpiSeriesPoint,
  TopPagesResponse,
  TopPagesRow,
  TopEventsResponse,
  TopEventsRow,
  TopSourcesResponse,
  TopSourcesRow,
  TopDevicesResponse,
  TopDevicesRow,
  TopCountriesResponse,
  TopCountriesRow,
  LeadActionsResponse,
  LeadActionsCurrent,
  SessionsResponse,
  SessionsRow,
  SessionDetailResponse,
  SessionDetailEvent,
  DeviceCategory,
  CustomRegistrationKey,
  SetupGate,
  JourneysQuery,
  JourneyStep,
  JourneyRow,
  JourneyResponse,
} from "./types/query";

export { ANALYTICS_ENDPOINT_PATHS } from "./constants/endpoints";
export type { AnalyticsEndpointKey } from "./constants/endpoints";

export { registerAnalyticsMocks, clearAnalyticsMocks } from "./services/analyticsService/mockRegistry";
export type {
  AnalyticsMockMap,
  RunReportMockFn,
  BatchRunReportsMockFn,
} from "./services/analyticsService/mockRegistry";
