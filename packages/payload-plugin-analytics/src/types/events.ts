import type { ENGAGEMENT_EVENTS, LEAD_ACTION_EVENTS, TRAFFIC_EVENTS } from "../constants/events";

export type TrafficEventName = (typeof TRAFFIC_EVENTS)[keyof typeof TRAFFIC_EVENTS];
export type EngagementEventName = (typeof ENGAGEMENT_EVENTS)[keyof typeof ENGAGEMENT_EVENTS];
export type LeadActionEventName = (typeof LEAD_ACTION_EVENTS)[keyof typeof LEAD_ACTION_EVENTS];
export type LeadActionKind = LeadActionEventName;

export type AnalyticsEventName = TrafficEventName | EngagementEventName | LeadActionEventName | (string & {});
