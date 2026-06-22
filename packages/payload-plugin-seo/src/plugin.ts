import type { Config, Plugin } from "payload";
import { setPluginConfig } from "./config";
import { PLUGIN_NAME } from "./constants";
import type { SeoPluginConfig } from "./types/config";
import { overrideAdmin } from "./utils/config/overrideAdmin";
import { mergeTranslations } from "./utils/config/mergeTranslations";
import { en } from "./translations/en";

const PREFIX = `[${PLUGIN_NAME}]`;

export const seoPlugin =
  (config: SeoPluginConfig): Plugin =>
  (incomingConfig: Config): Config => {
    if (config.disabled) return incomingConfig;

    if (!config.collections?.length) {
      console.warn(
        `${PREFIX} Disabled: config.collections must list at least one collection slug. Plugin not registered.`
      );
      return incomingConfig;
    }

    setPluginConfig(config);

    const merged = mergeTranslations(
      (incomingConfig.i18n?.translations as never) ?? {},
      mergeTranslations(en, config.translations ?? {})
    );

    const withTranslations: Config = {
      ...incomingConfig,
      i18n: { ...incomingConfig.i18n, translations: merged as never },
    };

    return overrideAdmin(withTranslations, config);
  };
