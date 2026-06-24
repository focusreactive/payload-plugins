"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { TopNQuery, TopSourcesResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useTopSourcesQuery(query: TopNQuery) {
  return useQuery({
    queryKey: analyticsKeys.topSources(query),
    queryFn: ({ signal }) =>
      analyticsFetch<TopNQuery, TopSourcesResponse>(ANALYTICS_ENDPOINT_PATHS.topSources, query, {
        signal,
      }),
  });
}
