"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsFetch } from "./client";
import { analyticsKeys } from "./keys";
import { customBlockEndpointPath } from "../../../../endpoints/customBlock";
import type { AnalyticsQuery } from "../../../../types/query";

export function useCustomBlockQuery<TData>(blockId: string, query: AnalyticsQuery) {
  return useQuery<TData>({
    queryKey: analyticsKeys.customBlock(blockId, query),
    queryFn: ({ signal }) => analyticsFetch<AnalyticsQuery, TData>(customBlockEndpointPath(blockId), query, { signal }),
  });
}
