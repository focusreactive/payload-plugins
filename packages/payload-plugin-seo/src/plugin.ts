import type { Config, Plugin } from "payload";
import type { SeoPluginConfig } from "./types/config";

export const seoPlugin =
  (config: SeoPluginConfig): Plugin =>
  (incomingConfig: Config): Config => {
    if (config.disabled) return incomingConfig;

    return incomingConfig;
  };
