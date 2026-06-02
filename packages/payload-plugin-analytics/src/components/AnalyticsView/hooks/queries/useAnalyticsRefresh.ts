"use client";

import { useSyncExternalStore } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { analyticsKeys } from "./keys";

export interface AnalyticsRefreshState {
  refresh: () => Promise<void>;
  lastUpdatedAt: number | null;
  isFetching: boolean;
}

export function useAnalyticsRefresh(): AnalyticsRefreshState {
  const qc = useQueryClient();
  const isFetchingCount = useIsFetching({ queryKey: analyticsKeys.all });

  const lastUpdatedAt = useSyncExternalStore(
    (cb) => qc.getQueryCache().subscribe(cb),
    () => {
      const queries = qc.getQueryCache().findAll({ queryKey: analyticsKeys.all });
      let max = 0;

      for (const q of queries) {
        if (q.state.dataUpdatedAt > max) max = q.state.dataUpdatedAt;
      }

      return max || null;
    },
    () => null
  );

  return {
    refresh: () => qc.invalidateQueries({ queryKey: analyticsKeys.all }),
    lastUpdatedAt,
    isFetching: isFetchingCount > 0,
  };
}
