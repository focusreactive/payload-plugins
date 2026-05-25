import type { AbCookieConfig } from "../cookie/types";
import type { StorageAdapter } from "../types/config";

export interface ResolveAbRewriteCookieConfig extends AbCookieConfig {
  /**
   * Prefix for the per-path bucket-assignment cookie.
   * Full name: `{prefix}_{encodeURIComponent(visiblePathname)}`.
   * Default: 'payload-ab-bucket'.
   */
  bucketCookiePrefix?: string;
  /** Max age for the visitor ID cookie in seconds. Default: 31_536_000 (365 days). */
  visitorIdMaxAge?: number;
  /** Max age for the experiment bucket cookie in seconds. Default: 7_776_000 (90 days). */
  expCookieMaxAge?: number;
}

export interface ResolveAbRewriteConfig<TVariantData extends object = object> {
  /** Storage adapter instance — must be the same one passed to the plugin. */
  storage: StorageAdapter<TVariantData>;
  /**
   * Extract the bucket string from a variant record.
   * The shape of TVariantData is whatever your `generateVariantData` returns,
   * so you decide which field holds the bucket identifier.
   */
  getBucket: (variant: TVariantData) => string;
  /**
   * Extract the Next.js internal rewrite path from a variant record.
   * Again, the field name is whatever you put in `generateVariantData`.
   */
  getRewritePath: (variant: TVariantData) => string;
  /**
   * Extract the traffic percentage (0–100) for a variant.
   * When provided, variants are selected by weight and the remaining
   * percentage (100 − sum of all variant weights) is assigned to 'original'.
   * When omitted, all variants and 'original' share equal probability.
   */
  getPassPercentage?: (variant: TVariantData) => number;
  /** Cookie names and TTLs — all have sensible defaults. */
  cookies?: ResolveAbRewriteCookieConfig;
}
