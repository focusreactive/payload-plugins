import { PLUGIN_NAME } from "./constants";
import type { ResolvedSeoThresholds, SeoPluginConfig } from "./types/config";

interface PluginState {
  config: SeoPluginConfig;
  thresholds: ResolvedSeoThresholds;
}

let pluginState: PluginState | null = null;

function getPluginState(): PluginState {
  if (!pluginState) throw new Error(`[${PLUGIN_NAME}] config accessed before initialization`);

  return pluginState;
}

export function setPluginConfig(config: SeoPluginConfig, thresholds: ResolvedSeoThresholds): void {
  pluginState = { config, thresholds };
}

export function getPluginConfig(): SeoPluginConfig {
  return getPluginState().config;
}

export function getResolvedThresholds(): ResolvedSeoThresholds {
  return getPluginState().thresholds;
}
