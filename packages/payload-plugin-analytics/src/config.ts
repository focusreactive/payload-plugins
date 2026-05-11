import { PLUGIN_NAME } from "./constants";
import type { AnalyticsPluginConfig } from "./types/config";

declare global {
  var __payloadPluginAnalyticsConfig: AnalyticsPluginConfig | undefined;
}

export function setPluginConfig(config: AnalyticsPluginConfig) {
  globalThis.__payloadPluginAnalyticsConfig = config;
}

export function getPluginConfig() {
  const config = globalThis.__payloadPluginAnalyticsConfig;

  if (!config) {
    throw new Error(`[${PLUGIN_NAME}] Plugin config not initialized.`);
  }

  return config;
}
