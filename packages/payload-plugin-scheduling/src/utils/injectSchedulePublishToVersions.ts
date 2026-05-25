import type { CollectionConfig, GlobalConfig, SchedulePublish } from "payload";

type Versions = CollectionConfig["versions"] | GlobalConfig["versions"];

export function injectSchedulePublishToVersions(
  versions: Versions,
  schedulePublishValue: SchedulePublish = true
): Versions {

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
