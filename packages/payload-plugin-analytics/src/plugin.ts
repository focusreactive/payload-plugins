import type { Config, Plugin } from "payload";
import { setPluginConfig, setResolvedLayout } from "./config";
import type { AnalyticsPluginConfig } from "./types/config";
import { PLUGIN_NAME } from "./constants";
import { buildEndpoints } from "./endpoints";
import { overrideAdmin } from "./utils/config/overrideAdmin";
import { mergeTranslations } from "./utils/config/mergeTranslations";
import { registerAnalyticsMocks } from "./services/analyticsService/mockRegistry";
import { resolveLayout } from "./services/layout/resolveLayout";

const MEASUREMENT_ID_RE = /^G-[A-Z0-9]+$/u;

export const analyticsPlugin =
  (config: AnalyticsPluginConfig): Plugin =>
  (incomingConfig: Config): Config => {
    if (config.disabled) return incomingConfig;

    if (!config.ga4) {
      console.warn(`[${PLUGIN_NAME}] config.ga4 is missing — plugin disabled`);
      return incomingConfig;
    }

    if (!MEASUREMENT_ID_RE.test(config.ga4.measurementId ?? "")) {
      console.warn(`[${PLUGIN_NAME}] ga4.measurementId must match ${MEASUREMENT_ID_RE} (got "${config.ga4.measurementId}") — plugin disabled`);
      return incomingConfig;
    }

    if (!config.ga4.propertyId) {
      console.warn(`[${PLUGIN_NAME}] ga4.propertyId is missing — plugin disabled`);
      return incomingConfig;
    }

    const serviceAccount = config.ga4.serviceAccount;
    if (!serviceAccount?.clientEmail || !serviceAccount?.privateKey) {
      console.warn(`[${PLUGIN_NAME}] ga4.serviceAccount.{ clientEmail, privateKey } missing — plugin disabled`);
      return incomingConfig;
    }

    setPluginConfig(config);

    const { resolved, registry } = resolveLayout(config);
    setResolvedLayout(resolved, registry);

    if (config.mocks === true) {
      void (async () => {
        const { defaultMocks } = await import("./services/analyticsService/mocks");
        registerAnalyticsMocks(defaultMocks);
      })();
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
        endpoints: [...(incomingConfig.endpoints ?? []), ...buildEndpoints(config, registry)],
      },
      {
        adminRegistry: config.leadActions?.adminRegistry,
        registry,
        sessionsTabComponent: resolved.sessionsTabComponent,
      }
    );
  };
