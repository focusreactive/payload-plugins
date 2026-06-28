const STORE_KEY = "__FR_SEO_CLIENT_CONFIG__";

export interface SeoClientConfig {
  enabled: boolean;
  extractByCollection: Record<string, string>;
}

const EMPTY: SeoClientConfig = {
  enabled: false,
  extractByCollection: {},
};

export function registerSeoClientConfig(config: SeoClientConfig): void {
  (globalThis as Record<string, unknown>)[STORE_KEY] = config;
}

export function getSeoClientConfig(): SeoClientConfig {
  return (
    ((globalThis as Record<string, unknown>)[STORE_KEY] as SeoClientConfig | undefined) ?? EMPTY
  );
}
