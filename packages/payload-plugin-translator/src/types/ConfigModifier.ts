import type { Config } from "payload";

/**
 * A config-time contribution: takes the Payload `config` and returns it — possibly a fresh object,
 * so callers must use the return value.
 */
export type ConfigModifier = (config: Config) => Config;
