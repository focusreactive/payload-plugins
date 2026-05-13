"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { TopCountriesResponse, TopNQuery } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useTopCountriesQuery(query: TopNQuery) {
  return useQuery({
    queryKey: analyticsKeys.topCountries(query),
    queryFn: ({ signal }) =>
      analyticsFetch<TopNQuery, TopCountriesResponse>(ANALYTICS_ENDPOINT_PATHS.topCountries, query, { signal }),
  });
}
