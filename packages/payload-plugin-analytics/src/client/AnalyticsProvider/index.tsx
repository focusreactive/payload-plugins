"use client";

import type { ReactNode } from "react";
import { useContext, useEffect, useMemo } from "react";
import type { AnalyticsProvider as AnalyticsProviderAdapter } from "../../types/provider";
import type { AutoTrackLeadActionsConfig } from "../../types/config";
import { installLeadActionListeners } from "../autoTrack";
import { RouteChangeTracker } from "../RouteChangeTracker";
import { AnalyticsContext } from "./AnalyticsContext";
import { PLUGIN_NAME } from "../../constants";

export interface AnalyticsProviderProps {
  provider: AnalyticsProviderAdapter;
  autoTrackLeadActions?: AutoTrackLeadActionsConfig;
  trackRouteChanges?: boolean;
  children: ReactNode;
}

export function AnalyticsProvider({
  provider,
  autoTrackLeadActions,
  trackRouteChanges = true,
  children,
}: AnalyticsProviderProps) {
  const parentCtx = useContext(AnalyticsContext);

  useEffect(() => {
    if (parentCtx && process.env.NODE_ENV !== "production") {
      console.warn(`[${PLUGIN_NAME}] Nested <AnalyticsProvider> detected — duplicate page_view events will fire.`);
    }
  }, [parentCtx]);

  const optsKey = useMemo(() => JSON.stringify(autoTrackLeadActions ?? {}), [autoTrackLeadActions]);

  useEffect(() => {
    return installLeadActionListeners(provider, autoTrackLeadActions);
  }, [provider, optsKey]);

  const ctxValue = useMemo(() => ({ provider }), [provider]);

  return (
    <AnalyticsContext.Provider value={ctxValue}>
      {provider.Scripts()}
      {trackRouteChanges && <RouteChangeTracker provider={provider} />}
      {children}
    </AnalyticsContext.Provider>
  );
}
