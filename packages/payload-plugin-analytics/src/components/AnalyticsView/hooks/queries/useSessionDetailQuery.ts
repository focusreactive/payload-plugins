"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { AnalyticsQuery, DateRange, SessionDetailResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useSessionDetailQuery(sessionId: string | null, dateRange: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.sessionDetail(sessionId, { dateRange }),
    queryFn: ({ signal }) =>
      analyticsFetch<AnalyticsQuery, SessionDetailResponse>(
        ANALYTICS_ENDPOINT_PATHS.sessionDetail.replace(":id", sessionId as string),
        { dateRange },
        { signal },
      ),
    enabled: !!sessionId,
  });
}
