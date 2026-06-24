"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_ENDPOINT_PATHS } from "../../../../constants/endpoints";
import type { JourneyResponse, JourneysQuery } from "../../../../types/query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";

export function useJourneysQuery(query: JourneysQuery) {
  return useQuery({
    queryKey: analyticsKeys.journeys(query),
    queryFn: ({ signal }) =>
      analyticsFetch<JourneysQuery, JourneyResponse>(ANALYTICS_ENDPOINT_PATHS.journeys, query, {
        signal,
      }),
  });
}
