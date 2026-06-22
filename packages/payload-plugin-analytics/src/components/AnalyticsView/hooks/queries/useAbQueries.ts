"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { AnalyticsQuery } from "../../../../types/query";
import type {
  AbExperimentQuery,
  AbKpisResponse,
  AbExperimentsListResponse,
  AbExperimentHeaderResponse,
  AbExposureResponse,
  AbOutcomeResponse,
  AbTimeSeriesResponse,
  AbLeadBreakdownResponse,
} from "../../../../types/ab";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useAbKpisQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: analyticsKeys.abKpis(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AnalyticsQuery, AbKpisResponse>(ANALYTICS_ENDPOINT_PATHS.abKpis, query, {
        signal,
      }),
  });
}

export function useAbExperimentsQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: analyticsKeys.abExperiments(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AnalyticsQuery, AbExperimentsListResponse>(
        ANALYTICS_ENDPOINT_PATHS.abExperimentsList,
        query,
        {
          signal,
        }
      ),
  });
}

function buildExperimentQuery(manifestKey: string, base: AnalyticsQuery): AbExperimentQuery {
  return { manifestKey, dateRange: base.dateRange, comparison: base.comparison };
}

export function useAbExperimentHeaderQuery(manifestKey: string | null, base: AnalyticsQuery) {
  const query = manifestKey ? buildExperimentQuery(manifestKey, base) : null;

  return useQuery({
    queryKey: query
      ? analyticsKeys.abHeader(query)
      : [...analyticsKeys.all, "abHeader", "__disabled__"],
    enabled: Boolean(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AbExperimentQuery, AbExperimentHeaderResponse>(
        ANALYTICS_ENDPOINT_PATHS.abExperimentHeader,
        query!,
        { signal }
      ),
  });
}

export function useAbExperimentExposureQuery(manifestKey: string | null, base: AnalyticsQuery) {
  const query = manifestKey ? buildExperimentQuery(manifestKey, base) : null;

  return useQuery({
    queryKey: query
      ? analyticsKeys.abExposure(query)
      : [...analyticsKeys.all, "abExposure", "__disabled__"],
    enabled: Boolean(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AbExperimentQuery, AbExposureResponse>(
        ANALYTICS_ENDPOINT_PATHS.abExperimentExposure,
        query!,
        {
          signal,
        }
      ),
  });
}

export function useAbExperimentOutcomeQuery(manifestKey: string | null, base: AnalyticsQuery) {
  const query = manifestKey ? buildExperimentQuery(manifestKey, base) : null;

  return useQuery({
    queryKey: query
      ? analyticsKeys.abOutcome(query)
      : [...analyticsKeys.all, "abOutcome", "__disabled__"],
    enabled: Boolean(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AbExperimentQuery, AbOutcomeResponse>(
        ANALYTICS_ENDPOINT_PATHS.abExperimentOutcome,
        query!,
        {
          signal,
        }
      ),
  });
}

export function useAbExperimentTimeSeriesQuery(manifestKey: string | null, base: AnalyticsQuery) {
  const query = manifestKey ? buildExperimentQuery(manifestKey, base) : null;

  return useQuery({
    queryKey: query
      ? analyticsKeys.abTimeSeries(query)
      : [...analyticsKeys.all, "abTimeSeries", "__disabled__"],
    enabled: Boolean(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AbExperimentQuery, AbTimeSeriesResponse>(
        ANALYTICS_ENDPOINT_PATHS.abExperimentTimeSeries,
        query!,
        {
          signal,
        }
      ),
  });
}

export function useAbExperimentLeadBreakdownQuery(
  manifestKey: string | null,
  base: AnalyticsQuery
) {
  const query = manifestKey ? buildExperimentQuery(manifestKey, base) : null;

  return useQuery({
    queryKey: query
      ? analyticsKeys.abLeadBreakdown(query)
      : [...analyticsKeys.all, "abLeadBreakdown", "__disabled__"],
    enabled: Boolean(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AbExperimentQuery, AbLeadBreakdownResponse>(
        ANALYTICS_ENDPOINT_PATHS.abExperimentLeadBreakdown,
        query!,
        { signal }
      ),
  });
}
