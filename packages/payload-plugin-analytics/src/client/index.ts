"use client";

export { AnalyticsProvider } from "./AnalyticsProvider";
export type { AnalyticsProviderProps } from "./AnalyticsProvider";
export { useLeadActionTypes } from "./AnalyticsProvider/LeadActionTypesContext";
export { Track } from "./Track";
export { TrackLeadAction } from "./Track/TrackLeadAction";
export type { TrackLeadActionProps } from "./Track/TrackLeadAction";
export { useAnalytics } from "./hooks/useAnalytics";
export {
  LeadActionRegistryProvider,
  createLeadActionRegistry,
  useLeadActionRegistry,
} from "../components/AnalyticsView/contexts/LeadActionRegistryContext";
export { ga4Provider } from "../providers/ga4Provider";
export {
  BUILT_IN_LEAD_ACTION_TYPES,
  ENGAGEMENT_EVENTS,
  FR_LEAD_TYPE_PARAM,
  LEAD_ACTION_EVENT_NAME,
  TRAFFIC_EVENTS,
} from "../constants/events";
export type { BuiltInLeadActionType } from "../constants/events";
export type { AnalyticsProvider as AnalyticsProviderAdapter } from "../types/provider";
export type {
  AnalyticsEventName,
  AutoTrackLeadActionsConfig,
  LeadActionKind,
  LeadActionRegistry,
  LeadActionRegistryEntry,
  LeadActionType,
  TrackOn,
  TrackProps,
} from "../types";
