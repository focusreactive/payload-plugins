import type { ENGAGEMENT_EVENTS, TRAFFIC_EVENTS } from "../constants/events";

export type TrafficEventName = (typeof TRAFFIC_EVENTS)[keyof typeof TRAFFIC_EVENTS];
export type EngagementEventName = (typeof ENGAGEMENT_EVENTS)[keyof typeof ENGAGEMENT_EVENTS];

export type LeadActionKind = string;

export type AnalyticsEventName = TrafficEventName | EngagementEventName | (string & {});
