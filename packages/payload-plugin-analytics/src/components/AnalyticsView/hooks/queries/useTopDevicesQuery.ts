"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { TopDevicesResponse, TopNQuery } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useTopDevicesQuery(query: TopNQuery) {
  return useQuery({
    queryKey: analyticsKeys.topDevices(query),
    queryFn: ({ signal }) =>
      analyticsFetch<TopNQuery, TopDevicesResponse>(ANALYTICS_ENDPOINT_PATHS.topDevices, query, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}
