import type { CollectionConfig, GlobalConfig } from 'payload'
import { injectSchedulePublishToVersions } from './injectSchedulePublishToVersions'

type VersionedConfig = CollectionConfig | GlobalConfig

export function applySchedulePublish<T extends VersionedConfig>(
  configs: T[] | undefined,
  enabledSlugs: string[],
): T[] | undefined {
  return configs?.map((config) => {
    if (!enabledSlugs.includes(config.slug)) return config

    return {
      ...config,
      versions: injectSchedulePublishToVersions(config.versions),
    }
  })
}
