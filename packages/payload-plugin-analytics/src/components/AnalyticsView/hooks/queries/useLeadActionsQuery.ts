"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { AnalyticsQuery, LeadActionsResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useLeadActionsQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: analyticsKeys.leadActions(query),
    queryFn: ({ signal }) =>
      analyticsFetch<AnalyticsQuery, LeadActionsResponse>(
        ANALYTICS_ENDPOINT_PATHS.leadActions,
        query,
        { signal }
      ),
  });
}
