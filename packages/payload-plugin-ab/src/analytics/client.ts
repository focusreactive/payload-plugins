"use client";

export type { ExperimentTrackerProps } from "./components/ExperimentTracker";
export type {
  UseABConversionOptions,
  TrackConversionFn,
} from "./hooks/useABConversion";
export type { AbCookieConfig } from "./../cookie/types";
export { resolveAbCookieNames } from "./../cookie/utils/resolveAbCookieNames";
export type { ResolvedAbCookieNames } from "./../cookie/utils/resolveAbCookieNames";

export {
  ABAnalyticsProvider,
  useABAnalytics,
} from "./components/ABAnalyticsProvider";
export { ExperimentTracker } from "./components/ExperimentTracker";
export { useABConversion } from "./hooks/useABConversion";
