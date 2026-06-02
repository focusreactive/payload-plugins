"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { TopCountriesQuery, TopCountriesResponse } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useTopCountriesQuery(query: TopCountriesQuery) {
  return useQuery({
    queryKey: analyticsKeys.topCountries(query),
    queryFn: ({ signal }) => analyticsFetch<TopCountriesQuery, TopCountriesResponse>(ANALYTICS_ENDPOINT_PATHS.topCountries, query, { signal }),
  });
}
