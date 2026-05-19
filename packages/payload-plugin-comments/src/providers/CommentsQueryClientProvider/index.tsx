"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";

const CommentsQueryClientContext = createContext<QueryClient | null>(null);

interface Props {
  children: ReactNode;
}

export function CommentsQueryClientProvider({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  return <CommentsQueryClientContext.Provider value={queryClient}>{children}</CommentsQueryClientContext.Provider>;
}

export function useCommentsQueryClient(): QueryClient {
  const queryClient = useContext(CommentsQueryClientContext);

  if (!queryClient) {
    throw new Error("useCommentsQueryClient must be used inside CommentsQueryClientProvider");
  }

  return queryClient;
}
