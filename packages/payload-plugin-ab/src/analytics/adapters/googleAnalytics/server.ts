import type { TrackImpressionArgs } from "../../types";
import { DEFAULT_IMPRESSION_EVENT_NAME, MEASUREMENT_PROTOCOL_URL } from "./constants";
import type { GoogleAnalyticsAdapterConfig } from "./types";

export async function trackImpressionServer(
  config: GoogleAnalyticsAdapterConfig,
  { experimentId, variantBucket, visitorId, locale, metadata }: TrackImpressionArgs,
) {
  if (!config.apiSecret) return;

  const url = `${MEASUREMENT_PROTOCOL_URL}?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: visitorId,
      events: [
        {
          name: config.impressionEventName ?? DEFAULT_IMPRESSION_EVENT_NAME,
          params: {
            experiment_id: experimentId,
            variant_bucket: variantBucket,
            visitor_id: visitorId,
            engagement_time_msec: 1,
            ...(locale !== undefined && { locale }),
            ...metadata,
          },
        },
      ],
    }),
  });
}
