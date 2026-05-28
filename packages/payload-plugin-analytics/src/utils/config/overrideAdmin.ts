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

  const customBlockEntries = Object.entries(options.registry ?? {}).filter(([id]) => !BUILTIN_BLOCK_IDS.has(id));

  const providers = [
    ...existingProviders,
    ...(options.adminRegistry ? [options.adminRegistry] : []),
    ...(options.sessionsTabComponent ? [options.sessionsTabComponent] : []),
  ];

  const customBlockDependencies = Object.fromEntries(
    customBlockEntries.map(([id, def]) => [
      `analyticsCustomBlock_${id}`,
      { type: "component" as const, path: def.component },
    ]),
  );

  return {
    ...incomingConfig,
    admin: {
      ...incomingConfig.admin,
      dependencies: {
        ...incomingConfig.admin?.dependencies,
        ...customBlockDependencies,
      },
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
