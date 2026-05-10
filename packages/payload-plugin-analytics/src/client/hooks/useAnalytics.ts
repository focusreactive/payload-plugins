"use client";

import { useContext } from "react";
import { AnalyticsContext } from "../AnalyticsProvider/AnalyticsContext";
import type { AnalyticsProvider } from "../../types/provider";

export interface UseAnalytics {
  track: (event: string, payload?: Record<string, unknown>) => void;
  pageView: (path: string) => void;
}

export function useAnalytics(): UseAnalytics {
  const ctx = useContext(AnalyticsContext);

  if (!ctx) throw new Error("useAnalytics must be used inside <AnalyticsProvider>");

  return {
    track: (event, payload) => ctx.provider.trackEvent(event, payload),
    pageView: (path) => ctx.provider.pageView(path),
  };
}

export function useAnalyticsProvider(): AnalyticsProvider {
  const ctx = useContext(AnalyticsContext);

  if (!ctx) throw new Error("useAnalyticsProvider must be used inside <AnalyticsProvider>");

  return ctx.provider;
}
