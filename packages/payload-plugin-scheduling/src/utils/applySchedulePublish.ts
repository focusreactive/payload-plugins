import type { CollectionConfig, GlobalConfig, SchedulePublish } from "payload";

import { injectSchedulePublishToVersions } from "./injectSchedulePublishToVersions";

type VersionedConfig = CollectionConfig | GlobalConfig;

export function applySchedulePublish<T extends VersionedConfig>(
  configs: T[] | undefined,
  enabledSlugs: string[],
  schedulePublish?: SchedulePublish
): T[] | undefined {
  return configs?.map((config) => {
    if (!enabledSlugs.includes(config.slug)) {return config;}

    return {
      ...config,
      versions: injectSchedulePublishToVersions(
        config.versions,
        schedulePublish
      ),
    };
  });
}
