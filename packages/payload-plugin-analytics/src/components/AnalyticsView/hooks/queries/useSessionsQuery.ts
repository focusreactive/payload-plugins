"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { SessionsListQuery, SessionsResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useSessionsQuery(query: SessionsListQuery) {
  return useInfiniteQuery({
    queryKey: analyticsKeys.sessions(query),
    queryFn: ({ pageParam, signal }) =>
      analyticsFetch<SessionsListQuery, SessionsResponse>(
        ANALYTICS_ENDPOINT_PATHS.sessions,
        { ...query, cursor: pageParam },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.pagination.hasMore ? (last.pagination.cursor ?? undefined) : undefined),
  });
}
