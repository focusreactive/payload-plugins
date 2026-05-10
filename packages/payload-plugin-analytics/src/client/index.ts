"use client";

export { AnalyticsProvider } from "./AnalyticsProvider";
export type { AnalyticsProviderProps } from "./AnalyticsProvider";
export { Track } from "./Track";
export { useAnalytics } from "./hooks/useAnalytics";
export { ga4Provider } from "../providers/ga4Provider";
export { ENGAGEMENT_EVENTS, LEAD_ACTION_EVENTS, TRAFFIC_EVENTS } from "../constants/events";
export type { AnalyticsProvider as AnalyticsProviderAdapter } from "../types/provider";
export type { AnalyticsEventName, AutoTrackLeadActionsConfig, LeadActionKind, TrackOn, TrackProps } from "../types";
