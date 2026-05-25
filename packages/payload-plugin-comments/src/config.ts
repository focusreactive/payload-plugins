import type { SanitizedConfig } from "payload";
import { PLUGIN_NAME } from "./constants";

const GLOBAL_CONFIG_KEY = `__${PLUGIN_NAME}_payload_config__`;

type GlobalThis = Record<string, unknown>;

export function setPayloadConfig(config: SanitizedConfig) {
  (globalThis as GlobalThis)[GLOBAL_CONFIG_KEY] = config;
}

export function getPayloadConfig(): SanitizedConfig {
  const config = (globalThis as GlobalThis)[GLOBAL_CONFIG_KEY] as SanitizedConfig | undefined;

  if (!config) {
    throw new Error(`[${PLUGIN_NAME}] Payload config not initialized.`);
  }

  return config;
}
