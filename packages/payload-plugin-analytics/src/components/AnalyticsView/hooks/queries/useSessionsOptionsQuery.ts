"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { DateRange, SessionsListQuery, SessionsResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export interface SessionsOptionsResult {
  sources: string[];
  countries: string[];
  setupRequired?: true;
}

const OPTIONS_LIMIT = 250;

export function useSessionsOptionsQuery(dateRange: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.sessionsOptions(dateRange),
    queryFn: ({ signal }) =>
      analyticsFetch<SessionsListQuery, SessionsResponse>(
        ANALYTICS_ENDPOINT_PATHS.sessions,
        { dateRange, comparison: { kind: "none" }, limit: OPTIONS_LIMIT },
        { signal }
      ),
    select: (res): SessionsOptionsResult => ({
      sources: [...new Set(res.rows.map((r) => r.source))].sort(),
      countries: [...new Set(res.rows.flatMap((r) => r.country))].sort(),
      setupRequired: res.setupRequired,
    }),
  });
}
