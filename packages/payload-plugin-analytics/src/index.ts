export { analyticsPlugin } from "./plugin";
export {
  BUILT_IN_LEAD_ACTION_TYPES,
  ENGAGEMENT_EVENTS,
  FR_LEAD_TYPE_PARAM,
  LEAD_ACTION_EVENT_NAME,
  TRAFFIC_EVENTS,
} from "./constants/events";
export type { BuiltInLeadActionType } from "./constants/events";
export type { AccessFn, AnalyticsPluginConfig, AutoTrackLeadActionsConfig, Ga4Config } from "./types/config";
export type { AnalyticsEventName, EngagementEventName, LeadActionKind, TrafficEventName } from "./types/events";
export type {
  LeadActionRegistry,
  LeadActionRegistryEntry,
  LeadActionType,
  LeadActionsPluginConfig,
} from "./types/leadActions";
export {
  LeadActionRegistryProvider,
  createLeadActionRegistry,
  useLeadActionRegistry,
} from "./components/AnalyticsView/contexts/LeadActionRegistryContext";

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
  TopCountriesQuery,
  TopCountriesDimension,
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
