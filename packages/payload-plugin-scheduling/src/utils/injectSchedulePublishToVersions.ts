import type { CollectionConfig, GlobalConfig } from "payload";

type Versions = CollectionConfig["versions"] | GlobalConfig["versions"];

const defaultDrafts = { schedulePublish: true };

export function injectSchedulePublishToVersions(versions: Versions) {
  if (!versions || versions === true) {
    return {
      drafts: defaultDrafts,
    };
  }

  const { drafts } = versions;

  if (!drafts || drafts === true) {
    return {
      ...versions,
      drafts: defaultDrafts,
    };
  }

  return {
    ...versions,
    drafts: {
      ...drafts,
      ...defaultDrafts,
    },
  };
}
