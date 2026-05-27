import type { Config } from "payload";
import { getComponentPath } from "../path/getComponentPath";
import type { LeadActionsPluginConfig } from "../../types/leadActions";

export interface OverrideAdminLeadActionOptions {
  adminRegistry?: LeadActionsPluginConfig["adminRegistry"];
}

export function overrideAdmin(incomingConfig: Config, options: OverrideAdminLeadActionOptions = {}): Config {
  const existingProviders = incomingConfig.admin?.components?.providers ?? [];
  const providers = options.adminRegistry ? [...existingProviders, options.adminRegistry] : existingProviders;

  return {
    ...incomingConfig,
    admin: {
      ...incomingConfig.admin,
      components: {
        ...incomingConfig.admin?.components,
        providers,
        views: {
          ...incomingConfig.admin?.components?.views,
          analytics: {
            Component: getComponentPath("components/AnalyticsView"),
            path: "/analytics",
            exact: true,
          },
        },
        actions: [
          ...(incomingConfig.admin?.components?.actions ?? []),
          getComponentPath("components/AnalyticsView/AnalyticsHeaderLink"),
        ],
      },
    },
  };
}
