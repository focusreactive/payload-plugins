import { DEFAULT_SEO_THRESHOLDS } from "../constants/thresholds";
import { fieldRangesFor } from "../measure/fieldRanges";
import type { FieldRanges } from "../measure/fieldRanges";

const STORE_KEY = "__FR_SEO_CLIENT_CONFIG__";

export interface SeoClientConfig {
  enabled: boolean;
  extractByCollection: Record<string, string>;
  fieldRanges: FieldRanges;
}

const EMPTY: SeoClientConfig = {
  enabled: false,
  extractByCollection: {},
  fieldRanges: fieldRangesFor(DEFAULT_SEO_THRESHOLDS),
};

export function registerSeoClientConfig(config: SeoClientConfig): void {
  (globalThis as Record<string, unknown>)[STORE_KEY] = config;
}

export function getSeoClientConfig(): SeoClientConfig {
  return (
    ((globalThis as Record<string, unknown>)[STORE_KEY] as SeoClientConfig | undefined) ?? EMPTY
  );
}
