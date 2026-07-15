import type { Config } from "payload";

/**
 * A config-time contribution: takes the Payload `config` and returns it (possibly a fresh object).
 * Each translator module exposes a `configure(ctx) → ConfigModifier`; the plugin registers them
 * through `PluginConfigBuilder.addConfigModifier`, which is the one place they are applied.
 *
 * Lives in `types/` (a leaf contract layer) so both `translation-levels` and the `provenance`
 * module can import it without creating a module cycle.
 */
export type ConfigModifier = (config: Config) => Config;
