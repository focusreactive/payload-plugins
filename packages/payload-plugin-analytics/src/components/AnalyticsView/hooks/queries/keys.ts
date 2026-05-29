import type {
  AnalyticsQuery,
  DateRange,
  JourneysQuery,
  SessionsListQuery,
  TopCountriesQuery,
  TopNQuery,
} from "../../../../types/query";
import type { AbExperimentQuery } from "../../../../types/ab";

const ROOT = ["analytics"] as const;

export const analyticsKeys = {
  all: ROOT,
  kpis: (q: AnalyticsQuery) => [...ROOT, "kpis", q] as const,
  topPages: (q: TopNQuery) => [...ROOT, "topPages", q] as const,
  topSources: (q: TopNQuery) => [...ROOT, "topSources", q] as const,
  topEvents: (q: TopNQuery) => [...ROOT, "topEvents", q] as const,
  topDevices: (q: TopNQuery) => [...ROOT, "topDevices", q] as const,
  topCountries: (q: TopCountriesQuery) => [...ROOT, "topCountries", q] as const,
  leadActions: (q: AnalyticsQuery) => [...ROOT, "leadActions", q] as const,
  journeys: (q: JourneysQuery) => [...ROOT, "journeys", q] as const,
  sessions: (q: SessionsListQuery) => [...ROOT, "sessions", q] as const,
  sessionsOptions: (dateRange: DateRange) => [...ROOT, "sessionsOptions", { dateRange }] as const,
  sessionDetail: (id: string | null, q: { dateRange: DateRange }) =>
    id ? ([...ROOT, "sessionDetail", id, q] as const) : ([...ROOT, "sessionDetail", "__disabled__"] as const),
  customBlock: (blockId: string, q: AnalyticsQuery) => [...ROOT, "customBlock", blockId, q] as const,
  abKpis: (q: AnalyticsQuery) => [...ROOT, "abKpis", q] as const,
  abExperiments: (q: AnalyticsQuery) => [...ROOT, "abExperiments", q] as const,
  abHeader: (q: AbExperimentQuery) => [...ROOT, "abHeader", q] as const,
  abExposure: (q: AbExperimentQuery) => [...ROOT, "abExposure", q] as const,
  abOutcome: (q: AbExperimentQuery) => [...ROOT, "abOutcome", q] as const,
  abTimeSeries: (q: AbExperimentQuery) => [...ROOT, "abTimeSeries", q] as const,
  abLeadBreakdown: (q: AbExperimentQuery) => [...ROOT, "abLeadBreakdown", q] as const,
};
