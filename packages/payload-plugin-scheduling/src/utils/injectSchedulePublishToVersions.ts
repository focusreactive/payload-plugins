import type { CollectionConfig, GlobalConfig, SchedulePublish } from "payload";

type Versions = CollectionConfig["versions"] | GlobalConfig["versions"];

export function injectSchedulePublishToVersions(
  versions: Versions,
  schedulePublish?: SchedulePublish,
): Versions {
  const schedulePublishValue = schedulePublish ?? true;

  if (!versions || versions === true) {
    return {
      drafts: { schedulePublish: schedulePublishValue },
    };
  }

  const { drafts } = versions;

  if (!drafts || drafts === true) {
    return {
      ...versions,
      drafts: { schedulePublish: schedulePublishValue },
    };
  }

  return {
    ...versions,
    drafts: {
      ...drafts,
      schedulePublish: schedulePublishValue,
    },
  };
}
