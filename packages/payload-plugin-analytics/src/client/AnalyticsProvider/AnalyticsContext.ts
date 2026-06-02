"use client";

import { createContext } from "react";
import type { AnalyticsProvider } from "../../types/provider";

export interface AnalyticsContextValue {
  provider: AnalyticsProvider;
}

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);
