"use client";

import { createContext, useContext } from "react";
import type { AnalyticsAdapter } from "../types";

export const ABAnalyticsContext = createContext<AnalyticsAdapter | null>(null);

export function useABAnalytics() {
  return useContext(ABAnalyticsContext);
}

export function ABAnalyticsProvider({
  adapter,
  children,
}: {
  adapter: AnalyticsAdapter;
  children: React.ReactNode;
}): React.ReactNode {
  return <ABAnalyticsContext.Provider value={adapter}>{children}</ABAnalyticsContext.Provider>;
}
