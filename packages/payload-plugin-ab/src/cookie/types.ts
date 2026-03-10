/**
 * Shared cookie name configuration consumed by both middleware and analytics utilities.
 * Create one instance and pass it to `createResolveAbRewrite` and all analytics
 * components/hooks to keep cookie names in sync automatically.
 */
export interface AbCookieConfig {
  /**
   * Cookie name used to track a stable visitor across sessions.
   * Default: 'ab_visitor_id'.
   */
  visitorIdCookieName?: string;
  /**
   * Derive the experiment tracking cookie name from the experiment/manifest key.
   * This cookie is written by middleware and read by analytics utilities.
   * Default: `exp_${encodeURIComponent(key)}`.
   */
  getExpCookieName?: (key: string) => string;
}
