export interface GoogleAnalyticsAdapterConfig {
  /** GA4 Measurement ID, e.g. "G-XXXXXXXXXX" */
  measurementId: string;
  /** GA4 Measurement Protocol API secret — enables trackImpressionServer() */
  apiSecret?: string;
  /**
   * GA4 Property resource name for the Data API — enables getStats().
   * Format: "properties/XXXXXXXXX"
   */
  propertyId?: string;
  /**
   * Returns a valid OAuth2 access token for the GA4 Data API.
   * Required for getStats(). Scopes needed: analytics.readonly.
   * @example
   *   import { GoogleAuth } from 'google-auth-library'
   *   const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/analytics.readonly'] })
   *   getAccessToken: () => auth.getAccessToken()
   */
  getAccessToken?: () => Promise<string>;
  /** Custom event name for impressions. Default: 'ab_impression' */
  impressionEventName?: string;
  /** Custom event name for conversions. Default: 'ab_conversion' */
  conversionEventName?: string;
}
