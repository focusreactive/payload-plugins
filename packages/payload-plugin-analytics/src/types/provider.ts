import type { ReactNode } from "react";

export interface AnalyticsProvider {
  readonly name: string;
  Scripts: () => ReactNode;
  trackEvent: (name: string, payload?: Record<string, unknown>) => void;
  pageView: (path: string) => void;
}
