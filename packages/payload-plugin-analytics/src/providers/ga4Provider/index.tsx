"use client";

import type { AnalyticsProvider } from "../../types/provider";
import { getPageTitle } from "../../utils/page/getPageTitle";
import { Ga4Scripts } from "./Ga4Scripts";
import { pushEvent } from "./pushEvent";
import { pushPageView } from "./pushPageView";

export function ga4Provider(config: { measurementId: string }): AnalyticsProvider {
  return {
    name: "ga4",
    Scripts: () => <Ga4Scripts measurementId={config.measurementId} />,
    trackEvent: (name, payload) => pushEvent(name, payload),
    pageView: (path) =>
      pushPageView(path, getPageTitle(), typeof window !== "undefined" ? window.location.href : ""),
  };
}
