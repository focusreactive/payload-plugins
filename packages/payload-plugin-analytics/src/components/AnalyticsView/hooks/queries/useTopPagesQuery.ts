"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { TopNQuery, TopPagesResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useTopPagesQuery(query: TopNQuery) {
  return useQuery({
    queryKey: analyticsKeys.topPages(query),
    queryFn: ({ signal }) =>
      analyticsFetch<TopNQuery, TopPagesResponse>(ANALYTICS_ENDPOINT_PATHS.topPages, query, {
        signal,
      }),
  });
}
