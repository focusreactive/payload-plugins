import type { Config } from "payload";
import { getComponentPath } from "../path/getComponentPath";
import { BUILTIN_LEAD_ACTIONS_BLOCK_IDS, BUILTIN_OVERVIEW_BLOCK_IDS } from "../../constants/layout";
import type { BlockDefinition, BlockId } from "../../types/layout";
import type { LeadActionsPluginConfig } from "../../types/leadActions";

const BUILTIN_BLOCK_IDS = new Set<string>([...BUILTIN_OVERVIEW_BLOCK_IDS, ...BUILTIN_LEAD_ACTIONS_BLOCK_IDS]);

export interface OverrideAdminOptions {
  adminRegistry?: LeadActionsPluginConfig["adminRegistry"];
  registry?: Record<BlockId, BlockDefinition>;
  sessionsTabComponent?: string | null;
}

export function overrideAdmin(incomingConfig: Config, options: OverrideAdminOptions = {}): Config {
  const existingProviders = incomingConfig.admin?.components?.providers ?? [];

  const customBlockPaths = Object.entries(options.registry ?? {})
    .filter(([id]) => !BUILTIN_BLOCK_IDS.has(id))
    .map(([, def]) => def.component);

  const providers = [
    ...existingProviders,
    ...(options.adminRegistry ? [options.adminRegistry] : []),
    ...(options.sessionsTabComponent ? [options.sessionsTabComponent] : []),
    ...customBlockPaths,
  ];

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
