import { PLUGIN_NAME } from "./constants";
import type { SeoPluginConfig } from "./types/config";

let pluginConfig: SeoPluginConfig | null = null;

export function setPluginConfig(config: SeoPluginConfig): void {
  pluginConfig = config;
}
export function getPluginConfig(): SeoPluginConfig {
  if (!pluginConfig) throw new Error(`[${PLUGIN_NAME}] config accessed before initialization`);

  return pluginConfig;
}
