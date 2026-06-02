"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAnalyticsQueryClient } from "./hooks/queries/queryClient";

export interface AnalyticsProvidersProps {
  children: ReactNode;
}

export function AnalyticsProviders({ children }: AnalyticsProvidersProps) {
  const [client] = useState(() => createAnalyticsQueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
