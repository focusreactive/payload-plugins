import type { Config, Plugin } from "payload";

import { DEFAULT_QUEUE } from "./constants";
import type { SchedulePublicationPluginConfig } from "./types";
import { applySchedulePublish } from "./utils/applySchedulePublish";
import { overrideEndpoints } from "./utils/overrideEndpoints";
import { overrideJobs } from "./utils/overrideJobs";
import { warnUnknownSlugs } from "./utils/warnUnknownSlugs";

export function schedulePublicationPlugin(
  options: SchedulePublicationPluginConfig
): Plugin {
  const {
    collections = [],
    globals = [],
    queue = DEFAULT_QUEUE,
    secret,
    schedulePublish,
  } = options;

  return (config: Config): Config => {
    warnUnknownSlugs(collections, config.collections, "collection");
    warnUnknownSlugs(globals, config.globals, "global");

    const updatedCollections = applySchedulePublish(
      config.collections,
      collections,
      schedulePublish
    );
    const updatedGlobals = applySchedulePublish(
      config.globals,
      globals,
      schedulePublish
    );

    return {
      ...config,
      collections: updatedCollections ?? config.collections,
      endpoints: overrideEndpoints(config.endpoints, secret, queue),
      globals: updatedGlobals ?? config.globals,
      jobs: overrideJobs(config.jobs, queue),
    };
  };
}
