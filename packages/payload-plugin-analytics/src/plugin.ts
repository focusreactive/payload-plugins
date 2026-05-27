import type { Config, Plugin } from "payload";
import { setPluginConfig } from "./config";
import type { AnalyticsPluginConfig } from "./types/config";
import { PLUGIN_NAME } from "./constants";
import { buildEndpoints } from "./endpoints";
import { overrideAdmin } from "./utils/config/overrideAdmin";
import { mergeTranslations } from "./utils/config/mergeTranslations";
import { registerAnalyticsMocks } from "./services/analyticsService/mockRegistry";

const MEASUREMENT_ID_RE = /^G-[A-Z0-9]+$/;

export const analyticsPlugin =
  (config: AnalyticsPluginConfig): Plugin =>
  (incomingConfig: Config): Config => {
    if (config.disabled) return incomingConfig;

    if (!config.ga4) {
      throw new Error(`[${PLUGIN_NAME}] config.ga4 is required`);
    }

    if (!MEASUREMENT_ID_RE.test(config.ga4.measurementId ?? "")) {
      throw new Error(
        `[${PLUGIN_NAME}] ga4.measurementId must match ${MEASUREMENT_ID_RE} (got "${config.ga4.measurementId}")`,
      );
    }

    if (!config.ga4.propertyId) {
      throw new Error(`[${PLUGIN_NAME}] ga4.propertyId is required`);
    }

    const serviceAccount = config.ga4.serviceAccount;
    if (!serviceAccount?.clientEmail || !serviceAccount?.privateKey) {
      console.warn(`[${PLUGIN_NAME}] ga4.serviceAccount.{ clientEmail, privateKey } missing`);
    }

    setPluginConfig(config);

    if (config.mocks === true) {
      void import("./services/analyticsService/mocks").then(({ defaultMocks }) => {
        registerAnalyticsMocks(defaultMocks);
      });
    }

    const incomingConfigTranslations = incomingConfig.i18n?.translations ?? {};
    const mergedTranslations = mergeTranslations(incomingConfigTranslations, config.translations ?? {});

    return overrideAdmin(
      {
        ...incomingConfig,
        i18n: {
          ...incomingConfig.i18n,
          translations: mergedTranslations,
        },
        endpoints: [...(incomingConfig.endpoints ?? []), ...buildEndpoints(config)],
      },
      { adminRegistry: config.leadActions?.adminRegistry },
    );
  };
