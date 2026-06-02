"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { AnalyticsQuery, KpiResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useKpisQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: analyticsKeys.kpis(query),
    queryFn: ({ signal }) => analyticsFetch<AnalyticsQuery, KpiResponse>(ANALYTICS_ENDPOINT_PATHS.kpis, query, { signal }),
  });
}
