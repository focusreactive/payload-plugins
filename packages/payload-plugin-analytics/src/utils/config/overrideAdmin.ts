import type { Config } from "payload";
import { getComponentPath } from "../path/getComponentPath";

export function overrideAdmin(incomingConfig: Config): Config {
  return {
    ...incomingConfig,
    admin: {
      ...incomingConfig.admin,
      components: {
        ...incomingConfig.admin?.components,
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
