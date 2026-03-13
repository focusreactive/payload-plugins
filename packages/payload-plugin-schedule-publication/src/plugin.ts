import type { Config, Plugin } from "payload";
import type { SchedulePublicationPluginConfig } from "./types";
import { DEFAULT_QUEUE } from "./constants";
import { applySchedulePublish } from "./utils/applySchedulePublish";
import { warnUnknownSlugs } from "./utils/warnUnknownSlugs";
import { overrideJobs } from "./utils/overrideJobs";
import { overrideEndpoints } from "./utils/overrideEndpoints";

export function schedulePublicationPlugin(
  options: SchedulePublicationPluginConfig,
): Plugin {
  const {
    collections = [],
    globals = [],
    queue = DEFAULT_QUEUE,
    secret,
  } = options;

  return (config: Config): Config => {
    warnUnknownSlugs(collections, config.collections, "collection");
    warnUnknownSlugs(globals, config.globals, "global");

    const updatedCollections = applySchedulePublish(
      config.collections,
      collections,
    );
    const updatedGlobals = applySchedulePublish(config.globals, globals);

    return {
      ...config,
      collections: updatedCollections ?? config.collections,
      globals: updatedGlobals ?? config.globals,
      jobs: overrideJobs(config.jobs, queue),
      endpoints: overrideEndpoints(config.endpoints, secret, queue),
    };
  };
}
