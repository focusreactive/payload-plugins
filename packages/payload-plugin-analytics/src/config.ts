import { PLUGIN_NAME } from "./constants";
import { resolvePagesConfig } from './config/resolvePagesConfig';
import type { ResolvedPagesConfig } from './config/resolvePagesConfig';
import type { AnalyticsPluginConfig } from "./types/config";
import type { BlockDefinition, BlockId, ResolvedLayout } from "./types/layout";

declare global {
  var __payloadPluginAnalyticsConfig: AnalyticsPluginConfig | undefined;
  var __payloadPluginAnalyticsResolvedLayout: ResolvedLayout | undefined;
  var __payloadPluginAnalyticsResolvedRegistry: Record<BlockId, BlockDefinition> | undefined;
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

export function setResolvedLayout(layout: ResolvedLayout, registry: Record<BlockId, BlockDefinition>) {
  globalThis.__payloadPluginAnalyticsResolvedLayout = layout;
  globalThis.__payloadPluginAnalyticsResolvedRegistry = registry;
}

export function getResolvedLayout(): ResolvedLayout {
  const layout = globalThis.__payloadPluginAnalyticsResolvedLayout;

  if (!layout) {
    throw new Error(`[${PLUGIN_NAME}] Resolved layout not initialized.`);
  }

  return layout;
}

export function getResolvedBlockRegistry(): Record<BlockId, BlockDefinition> {
  const registry = globalThis.__payloadPluginAnalyticsResolvedRegistry;

  if (!registry) {
    throw new Error(`[${PLUGIN_NAME}] Resolved block registry not initialized.`);
  }

  return registry;
}

export function getResolvedPagesConfig(): ResolvedPagesConfig | null {
  return resolvePagesConfig(getPluginConfig().pages);
}
