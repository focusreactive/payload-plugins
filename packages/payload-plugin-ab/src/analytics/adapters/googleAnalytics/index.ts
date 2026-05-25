import type { AnalyticsAdapter } from "../../types";
import { trackConversionClient, trackImpressionClient } from "./client";
import { trackImpressionServer } from "./server";
import { getExperimentStats } from "./stats";
import type { GoogleAnalyticsAdapterConfig } from "./types";

export type { GoogleAnalyticsAdapterConfig };

export function googleAnalyticsAdapter(config: GoogleAnalyticsAdapterConfig): AnalyticsAdapter {
  return {
    trackImpression: (args) => trackImpressionClient(config, args),
    trackConversion: (args) => trackConversionClient(config, args),
    ...(config.apiSecret != null && {
      trackImpressionServer: (args) => trackImpressionServer(config, args),
    }),
    ...(config.propertyId != null
      && config.getAccessToken != null && {
        getStats: (experimentId, dateRange) => getExperimentStats(config, experimentId, dateRange),
      }),
  };
}
