"use client";

import { AnalyticsProvider, ga4Provider } from "@focus-reactive/payload-plugin-analytics/client";
import type { ReactNode } from "react";

interface AnalyticsProviderClientProps {
  measurementId?: string;
  children: ReactNode;
}

type Provider = ReturnType<typeof ga4Provider>;

/**
 * Without a GA4 id (the cookieless CT setup, §5.10) the provider is a no-op: the context stays for
 * components such as TrackPage, but no Google script is requested and nothing is tracked.
 */
const noopProvider: Provider = {
  name: "none",
  pageView: () => undefined,
  Scripts: () => null,
  trackEvent: () => undefined,
};

export function AnalyticsProviderClient({ measurementId, children }: AnalyticsProviderClientProps) {
  const provider = measurementId?.startsWith("G-") ? ga4Provider({ measurementId }) : noopProvider;
  return (
    <AnalyticsProvider provider={provider} trackRouteChanges={false}>
      {children}
    </AnalyticsProvider>
  );
}
