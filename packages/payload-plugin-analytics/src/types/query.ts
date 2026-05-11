import type { LeadActionKind } from "./events";

// Inputs
export type DateRangePreset = "today" | "yesterday" | "last-7d" | "last-30d" | "last-90d";

export type DateRange = { preset: DateRangePreset } | { from: string; to: string };

export type Comparison = { kind: "none" } | { kind: "previous-period" };

export interface AnalyticsQuery {
  dateRange: DateRange;
  comparison?: Comparison;
}

export interface TopNQuery extends AnalyticsQuery {
  limit?: number;
}

export interface SessionsListQuery extends AnalyticsQuery {
  limit?: number;
  cursor?: string;
  hadLeadAction?: boolean;
}

// Responses
export interface KpiCurrent {
  sessions: number;
  users: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
}
export interface KpiSeriesPoint {
  date: string;
  sessions: number;
  users: number;
  pageViews: number;
}
export interface KpiResponse {
  current: KpiCurrent;
  comparison?: KpiCurrent;
  series: KpiSeriesPoint[];
}

export interface TopPagesRow {
  pagePath: string;
  pageTitle: string;
  pageViews: number;
  sessions: number;
  avgTime: number;
}
export interface TopPagesResponse {
  rows: TopPagesRow[];
  total: number;
  comparison?: { rows: TopPagesRow[]; total: number };
}

export interface TopEventsRow {
  eventName: string;
  eventCount: number;
  eventCountPerUser: number;
}
export interface TopEventsResponse {
  rows: TopEventsRow[];
  comparison?: { rows: TopEventsRow[] };
}

export interface TopSourcesRow {
  source: string;
  medium: string;
  channel: string;
  sessions: number;
  users: number;
}
export interface TopSourcesResponse {
  rows: TopSourcesRow[];
  comparison?: { rows: TopSourcesRow[] };
}

export type DeviceCategory = "desktop" | "mobile" | "tablet" | "other";

export interface TopDevicesRow {
  deviceCategory: DeviceCategory;
  browser: string;
  os: string;
  sessions: number;
  users: number;
}
export interface TopDevicesResponse {
  rows: TopDevicesRow[];
  comparison?: { rows: TopDevicesRow[] };
}

export interface TopCountriesRow {
  country: string;
  city: string;
  sessions: number;
  users: number;
}
export interface TopCountriesResponse {
  rows: TopCountriesRow[];
  comparison?: { rows: TopCountriesRow[] };
}

export interface LeadActionsCurrent {
  totals: Record<LeadActionKind, number>;
  conversionRate: Record<LeadActionKind, number>;
  perPage: Array<{ pagePath: string; counts: Partial<Record<LeadActionKind, number>> }>;
  avgTimeToAction: number;
}
export interface LeadActionsResponse {
  current: LeadActionsCurrent;
  comparison?: LeadActionsCurrent;
}

export interface SessionsRow {
  sessionId: string;
  landingPage: string;
  source: string;
  deviceCategory: DeviceCategory;
  country: string;
  startedAt: string;
  eventCount: number;
  hadLeadAction: boolean;
}
export interface SessionsResponse {
  rows: SessionsRow[];
  pagination: { cursor: string | null; hasMore: boolean };
}

export interface SessionDetailEvent {
  timestamp: string;
  eventName: string;
  pagePath?: string;
  params?: Record<string, unknown>;
}
export interface SessionDetailResponse {
  sessionId: string;
  events: SessionDetailEvent[];
}

export interface Row {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
}
