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
import { buildAbKpisEndpoint } from "./ab/kpis";
import { buildAbExperimentsListEndpoint } from "./ab/experimentsList";
import { buildAbExperimentHeaderEndpoint } from "./ab/experimentHeader";
import { buildAbExperimentExposureEndpoint } from "./ab/experimentExposure";
import { buildAbExperimentOutcomeEndpoint } from "./ab/experimentOutcome";
import { buildAbExperimentTimeSeriesEndpoint } from "./ab/experimentTimeSeries";
import { buildAbExperimentLeadBreakdownEndpoint } from "./ab/experimentLeadBreakdown";

export function buildEndpoints(
  config: AnalyticsPluginConfig,
  registry: Record<BlockId, BlockDefinition> = {}
): Endpoint[] {
  const customBlockEndpoints: Endpoint[] = [];

  for (const [blockId, def] of Object.entries(registry)) {
    if (def.fetch) {
      customBlockEndpoints.push(buildCustomBlockEndpoint(config, blockId, def));
    }
  }

  const abEndpoints: Endpoint[] = config.ab
    ? [
        buildAbKpisEndpoint(config),
        buildAbExperimentsListEndpoint(config),
        buildAbExperimentHeaderEndpoint(config),
        buildAbExperimentExposureEndpoint(config),
        buildAbExperimentOutcomeEndpoint(config),
        buildAbExperimentTimeSeriesEndpoint(config),
        buildAbExperimentLeadBreakdownEndpoint(config),
      ]
    : [];

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
    ...abEndpoints,
  ];
}
