import { QueryClient } from "@tanstack/react-query";
import { AnalyticsHttpError } from "./client";

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 10 * 60 * 1000;
const MAX_RETRIES = 2;
const RETRY_DELAY_CAP_MS = 4000;

export function createAnalyticsQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (error instanceof AnalyticsHttpError && error.status >= 400 && error.status < 500) {
            return false;
          }

          return failureCount < MAX_RETRIES;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, RETRY_DELAY_CAP_MS),
      },
    },
  });
}
