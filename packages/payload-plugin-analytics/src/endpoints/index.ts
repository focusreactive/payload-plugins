import type { Endpoint } from "payload";
import type { AnalyticsPluginConfig } from "../types/config";
import type { BlockDefinition, BlockId } from "../types/layout";
import { buildKpisEndpoint } from "./kpis";
import { buildTopPagesEndpoint } from "./topPages";
import { buildTopEventsEndpoint } from "./topEvents";
import { buildTopSourcesEndpoint } from "./topSources";
import { buildTopDevicesEndpoint } from "./topDevices";
import { buildTopCountriesEndpoint } from "./topCountries";
import { buildLeadActionsEndpoint } from "./leadActions";
import { buildSessionsEndpoint } from "./sessions";
import { buildSessionDetailEndpoint } from "./sessionDetail";
import { buildJourneysEndpoint } from "./journeys";
import { buildCustomBlockEndpoint } from "./customBlock";

export function buildEndpoints(
  config: AnalyticsPluginConfig,
  registry: Record<BlockId, BlockDefinition> = {},
): Endpoint[] {
  const customBlockEndpoints: Endpoint[] = [];
  
  for (const [blockId, def] of Object.entries(registry)) {
    if (def.fetch) {
      customBlockEndpoints.push(buildCustomBlockEndpoint(config, blockId, def));
    }
  }

  return [
    buildKpisEndpoint(config),
    buildTopPagesEndpoint(config),
    buildTopEventsEndpoint(config),
    buildTopSourcesEndpoint(config),
    buildTopDevicesEndpoint(config),
    buildTopCountriesEndpoint(config),
    buildLeadActionsEndpoint(config),
    buildSessionsEndpoint(config),
    buildSessionDetailEndpoint(config),
    buildJourneysEndpoint(config),
    ...customBlockEndpoints,
  ];
}
