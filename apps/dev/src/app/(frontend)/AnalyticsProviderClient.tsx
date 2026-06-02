"use client";

import { AnalyticsProvider, ga4Provider } from "@focus-reactive/payload-plugin-analytics/client";
import type { ReactNode } from "react";

interface AnalyticsProviderClientProps {
  measurementId: string;
  children: ReactNode;
}

export function AnalyticsProviderClient({ measurementId, children }: AnalyticsProviderClientProps) {
  return <AnalyticsProvider provider={ga4Provider({ measurementId })}>{children}</AnalyticsProvider>;
}
