type TrackMetadata = Record<string, string | number | boolean>;

export interface TrackImpressionArgs {
  /** The experiment identifier — typically the URL path, e.g. "/en/about" */
  experimentId: string;
  /** The assigned variant bucket, e.g. "a", "b" */
  variantBucket: string;
  visitorId: string;
  locale?: string;
  metadata?: TrackMetadata;
}

export interface TrackConversionArgs {
  /** The experiment identifier — typically the URL path, e.g. "/en/about" */
  experimentId: string;
  /** The assigned variant bucket, e.g. "a", "b" */
  variantBucket: string;
  visitorId: string;
  /** Identifies what conversion goal was achieved, e.g. "cta_click", "purchase" */
  goalId: string;
  /** Optional numeric value for statistics */
  goalValue?: number;
  locale?: string;
  metadata?: TrackMetadata;
}

export interface DateRange {
  /** 'NdaysAgo' or 'YYYY-MM-DD' */
  startDate: string;
  /** 'NdaysAgo', 'today', or 'YYYY-MM-DD' */
  endDate: string;
}

export interface VariantStats {
  bucket: string;
  impressions: number;
  /** Fraction of total impressions (0–1) */
  impressionShare: number;
  conversions: number;
  /** conversions / impressions (0–1), 0 when impressions = 0 */
  conversionRate: number;
}

export interface ExperimentStats {
  experimentId: string;
  dateRange: DateRange;
  variants: VariantStats[];
  totals: {
    impressions: number;
    conversions: number;
  };
}

export interface AnalyticsAdapter {
  /**
   * Fire when a user is assigned to and shown a variant.
   * Called client-side from ExperimentTracker.
   */
  trackImpression(args: TrackImpressionArgs): void;

  /**
   * Fire when a user completes a conversion goal.
   * Called client-side from useABConversion.
   */
  trackConversion(args: TrackConversionArgs): void;

  /**
   * Optional: fire an impression server-side (RSC / Server Action / middleware).
   * Implemented via GA4 Measurement Protocol when apiSecret is provided.
   */
  trackImpressionServer?(args: TrackImpressionArgs): Promise<void>;

  /**
   * Optional: fetch aggregated stats for an experiment.
   * Powers the ExperimentStatsWidget admin component.
   * Requires propertyId and getAccessToken in the adapter config.
   */
  getStats?(experimentId: string, dateRange?: DateRange): Promise<ExperimentStats>;
}
