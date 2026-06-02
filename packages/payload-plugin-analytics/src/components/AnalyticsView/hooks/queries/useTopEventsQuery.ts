"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { TopEventsResponse, TopNQuery } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useTopEventsQuery(query: TopNQuery) {
  return useQuery({
    queryKey: analyticsKeys.topEvents(query),
    queryFn: ({ signal }) => analyticsFetch<TopNQuery, TopEventsResponse>(ANALYTICS_ENDPOINT_PATHS.topEvents, query, { signal }),
  });
}
