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
const PREFIX = `[${PLUGIN_NAME}]`;

/** Why the GA4 config cannot be used, or undefined when it is complete. */
function ga4ConfigProblem(ga4: AnalyticsPluginConfig["ga4"] | undefined): string | undefined {
  if (!ga4) return "ga4 config is missing";

  if (!MEASUREMENT_ID_RE.test(ga4.measurementId ?? "")) {
    return `ga4.measurementId "${ga4.measurementId ?? ""}" is not a valid GA4 ID (expected G-XXXXXXX, likely GA4_MEASUREMENT_ID not set)`;
  }

  if (!ga4.propertyId) return "ga4.propertyId is missing (likely GA4_PROPERTY_ID not set)";

  if (!ga4.serviceAccount?.clientEmail || !ga4.serviceAccount?.privateKey) {
    return "ga4.serviceAccount.{ clientEmail, privateKey } missing (likely GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY not set)";
  }

  return undefined;
}

export const analyticsPlugin =
  (config: AnalyticsPluginConfig): Plugin =>
  (incomingConfig: Config): Config => {
    if (config.disabled) return incomingConfig;

    const { resolved, registry } = resolveLayout(config);
    const adminOptions = {
      adminRegistry: config.leadActions?.adminRegistry,
      registry,
      sessionsTabComponent: resolved.sessionsTabComponent,
    };

    const problem = ga4ConfigProblem(config.ga4);
    if (problem) {
      // Credentials usually come from env vars, so the admin components stay registered (they hide
      // themselves while the plugin is not configured). Otherwise `payload generate:importmap` run
      // without GA4 env vars drops them, and a deployment that has the vars cannot render them.
      console.warn(
        `${PREFIX} Disabled: ${problem}. Endpoints not registered; the admin view stays hidden.`
      );
      return overrideAdmin(incomingConfig, adminOptions);
    }

    setPluginConfig(config);
    setResolvedLayout(resolved, registry);

    if (config.mocks === true) {
      void (async () => {
        const { defaultMocks } = await import("./services/analyticsService/mocks");
        registerAnalyticsMocks(defaultMocks);
      })();
    }

    const incomingConfigTranslations = incomingConfig.i18n?.translations ?? {};
    const mergedTranslations = mergeTranslations(
      incomingConfigTranslations,
      config.translations ?? {}
    );

    return overrideAdmin(
      {
        ...incomingConfig,
        i18n: {
          ...incomingConfig.i18n,
          translations: mergedTranslations,
        },
        endpoints: [...(incomingConfig.endpoints ?? []), ...buildEndpoints(config, registry)],
      },
      adminOptions
    );
  };
