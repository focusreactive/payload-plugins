"use client";

import type { ReactNode } from "react";
import { Suspense, useContext, useEffect, useMemo } from "react";
import type { AnalyticsProvider as AnalyticsProviderAdapter } from "../../types/provider";
import type { AutoTrackLeadActionsConfig } from "../../types/config";
import type { LeadActionType } from "../../types/leadActions";
import { installLeadActionListeners } from "../autoTrack";
import { RouteChangeTracker } from "../RouteChangeTracker";
import { AnalyticsContext } from "./AnalyticsContext";
import { LeadActionTypesContext } from "./LeadActionTypesContext";
import { resolveLeadActionTypes } from "../../utils/leadActions/resolveLeadActionTypes";
import { PLUGIN_NAME } from "../../constants";

export interface AnalyticsProviderProps {
  provider: AnalyticsProviderAdapter;
  leadActionTypes?: LeadActionType[];
  autoTrackLeadActions?: AutoTrackLeadActionsConfig;
  trackRouteChanges?: boolean;
  children: ReactNode;
}

export function AnalyticsProvider({ provider, leadActionTypes, autoTrackLeadActions, trackRouteChanges = true, children }: AnalyticsProviderProps) {
  const parentCtx = useContext(AnalyticsContext);

  useEffect(() => {
    if (parentCtx && process.env.NODE_ENV !== "production") {
      console.warn(`[${PLUGIN_NAME}] Nested <AnalyticsProvider> detected — duplicate page_view events will fire.`);
    }
  }, [parentCtx]);

  const resolvedTypes = useMemo(() => resolveLeadActionTypes(leadActionTypes), [leadActionTypes]);
  const optsKey = useMemo(() => JSON.stringify(autoTrackLeadActions ?? {}), [autoTrackLeadActions]);

  useEffect(() => {
    return installLeadActionListeners(provider, autoTrackLeadActions, resolvedTypes);
  }, [provider, optsKey, resolvedTypes]);

  const ctxValue = useMemo(() => ({ provider }), [provider]);

  return (
    <AnalyticsContext.Provider value={ctxValue}>
      <LeadActionTypesContext.Provider value={resolvedTypes}>
        {provider.Scripts()}
        {trackRouteChanges && (
          <Suspense fallback={null}>
            <RouteChangeTracker provider={provider} />
          </Suspense>
        )}
        {children}
      </LeadActionTypesContext.Provider>
    </AnalyticsContext.Provider>
  );
}
