"use client";

import { useContext } from "react";
import { AnalyticsContext } from "../AnalyticsProvider/AnalyticsContext";
import { FR_LEAD_TYPE_PARAM, LEAD_ACTION_EVENT_NAME } from "../../constants/events";
import type { AnalyticsProvider } from "../../types/provider";
import type { LeadActionType } from "../../types/leadActions";

export interface UseAnalytics {
  track: (event: string, payload?: Record<string, unknown>) => void;
  trackLeadAction: (type: LeadActionType, payload?: Record<string, unknown>) => void;
  pageView: (path: string) => void;
}

export function useAnalytics(): UseAnalytics {
  const ctx = useContext(AnalyticsContext);

  if (!ctx) throw new Error("useAnalytics must be used inside <AnalyticsProvider>");

  return {
    track: (event, payload) => ctx.provider.trackEvent(event, payload),
    trackLeadAction: (type, payload) => ctx.provider.trackEvent(LEAD_ACTION_EVENT_NAME, { [FR_LEAD_TYPE_PARAM]: type, ...payload }),
    pageView: (path) => ctx.provider.pageView(path),
  };
}

export function useAnalyticsProvider(): AnalyticsProvider {
  const ctx = useContext(AnalyticsContext);

  if (!ctx) throw new Error("useAnalyticsProvider must be used inside <AnalyticsProvider>");

  return ctx.provider;
}
