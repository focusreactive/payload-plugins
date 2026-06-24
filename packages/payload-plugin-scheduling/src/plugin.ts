import type { Config, Plugin } from "payload";
import type { SchedulePublicationPluginConfig } from "./types";
import { DEFAULT_QUEUE, PLUGIN_NAME } from "./constants";
import { applySchedulePublish } from "./utils/applySchedulePublish";
import { warnUnknownSlugs } from "./utils/warnUnknownSlugs";
import { overrideJobs } from "./utils/overrideJobs";
import { overrideEndpoints } from "./utils/overrideEndpoints";

const PREFIX = `[${PLUGIN_NAME}]`;

export function schedulePublicationPlugin(options: SchedulePublicationPluginConfig): Plugin {
  const {
    collections = [],
    globals = [],
    queue = DEFAULT_QUEUE,
    secret,
    schedulePublish,
  } = options;

  return (config: Config): Config => {
    if (!secret || typeof secret !== "string") {
      console.warn(
        `${PREFIX} Disabled: required option "secret" is missing or empty (likely CRON_SECRET not set). Scheduled-publish endpoints not registered.`
      );
      return config;
    }

    warnUnknownSlugs(collections, config.collections, "collection");
    warnUnknownSlugs(globals, config.globals, "global");

    const updatedCollections = applySchedulePublish(
      config.collections,
      collections,
      schedulePublish
    );
    const updatedGlobals = applySchedulePublish(config.globals, globals, schedulePublish);

    return {
      ...config,
      collections: updatedCollections ?? config.collections,
      globals: updatedGlobals ?? config.globals,
      jobs: overrideJobs(config.jobs, queue),
      endpoints: overrideEndpoints(config.endpoints, secret, queue),
    };
  };
}
