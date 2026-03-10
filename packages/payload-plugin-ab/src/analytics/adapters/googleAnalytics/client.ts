import type { TrackConversionArgs, TrackImpressionArgs } from "../../types";
import type { GoogleAnalyticsAdapterConfig } from "./types";
import { DEFAULT_CONVERSION_EVENT_NAME, DEFAULT_IMPRESSION_EVENT_NAME } from "./constants";
import { canUseGtag } from "./utils/canUseGtag";
import { waitForGtag } from "./utils/waitForGtag";

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params: Record<string, unknown>) => void;
  }
}

export function trackImpressionClient(
  config: GoogleAnalyticsAdapterConfig,
  { experimentId, variantBucket, visitorId, locale, metadata }: TrackImpressionArgs,
) {
  waitForGtag((gtag) => {
    gtag("event", config.impressionEventName ?? DEFAULT_IMPRESSION_EVENT_NAME, {
      experiment_id: experimentId,
      variant_bucket: variantBucket,
      visitor_id: visitorId,
      ...(locale !== undefined && { locale }),
      ...metadata,
    });
  });
}

export function trackConversionClient(
  config: GoogleAnalyticsAdapterConfig,
  { experimentId, goalId, variantBucket, visitorId, goalValue, locale, metadata }: TrackConversionArgs,
) {
  if (!canUseGtag(window)) {
    return;
  }

  window.gtag("event", config.conversionEventName ?? DEFAULT_CONVERSION_EVENT_NAME, {
    experiment_id: experimentId,
    variant_bucket: variantBucket,
    visitor_id: visitorId,
    goal_id: goalId,
    ...(goalValue !== undefined && { value: goalValue }),
    ...(locale !== undefined && { locale }),
    ...metadata,
  });
}
