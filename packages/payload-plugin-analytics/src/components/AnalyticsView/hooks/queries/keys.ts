import type { AnalyticsQuery, DateRange, JourneysQuery, SessionsListQuery, TopNQuery } from "../../../../types/query";

const ROOT = ["analytics"] as const;

export const analyticsKeys = {
  all: ROOT,
  kpis: (q: AnalyticsQuery) => [...ROOT, "kpis", q] as const,
  topPages: (q: TopNQuery) => [...ROOT, "topPages", q] as const,
  topSources: (q: TopNQuery) => [...ROOT, "topSources", q] as const,
  topEvents: (q: TopNQuery) => [...ROOT, "topEvents", q] as const,
  topDevices: (q: TopNQuery) => [...ROOT, "topDevices", q] as const,
  topCountries: (q: TopNQuery) => [...ROOT, "topCountries", q] as const,
  leadActions: (q: AnalyticsQuery) => [...ROOT, "leadActions", q] as const,
  journeys: (q: JourneysQuery) => [...ROOT, "journeys", q] as const,
  sessions: (q: SessionsListQuery) => [...ROOT, "sessions", q] as const,
  sessionsOptions: (dateRange: DateRange) => [...ROOT, "sessionsOptions", { dateRange }] as const,
  sessionDetail: (id: string | null, q: { dateRange: DateRange }) =>
    id ? ([...ROOT, "sessionDetail", id, q] as const) : ([...ROOT, "sessionDetail", "__disabled__"] as const),
};
