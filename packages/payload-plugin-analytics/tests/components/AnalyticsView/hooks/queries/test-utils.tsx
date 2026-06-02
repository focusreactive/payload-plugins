import type { JSX } from "react";
import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAnalyticsQueryClient } from "../../../../../src/components/AnalyticsView/hooks/queries/queryClient";

export interface TestQueryClientOptions {
  productionDefaults?: boolean;
}

export function createTestQueryClient(opts: TestQueryClientOptions = {}) {
  if (opts.productionDefaults) return createAnalyticsQueryClient();

  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function createWrapper(client?: QueryClient): {
  client: QueryClient;
  Wrapper: (props: { children: ReactNode }) => JSX.Element;
} {
  const qc = client ?? createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }

  return { client: qc, Wrapper };
}

export function mockFetchOnce(response: Response | Promise<Response>): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}
