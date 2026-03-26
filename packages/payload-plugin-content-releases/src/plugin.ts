import type { Config, Plugin } from "payload";
import type { ContentReleasesPluginConfig } from "./types";
import { PLUGIN_NAME, DEFAULT_CONFLICT_STRATEGY, DEFAULT_PUBLISH_BATCH_SIZE } from "./constants";

const SIDEBAR_FIELD_PATH =
  "@focus-reactive/payload-plugin-content-releases/client#ReleaseSidebarField";
import { buildReleasesCollection } from "./collections/releases";
import { buildReleaseItemsCollection } from "./collections/releaseItems";
import { releasesBeforeChange } from "./hooks/releasesBeforeChange";
import { buildReleaseItemsBeforeChange } from "./hooks/releaseItemsBeforeChange";
import { createPublishReleaseHandler } from "./endpoints/publishRelease";
import { createCheckConflictsHandler } from "./endpoints/checkConflicts";
import { createRunScheduledHandler } from "./endpoints/runScheduled";

export function contentReleasesPlugin(
  options: ContentReleasesPluginConfig,
): Plugin {
  const { enabledCollections, access } = options;

  return (config: Config): Config => {
    for (const slug of enabledCollections) {
      if (!config.collections?.find((c) => c.slug === slug)) {
        console.warn(
          `[${PLUGIN_NAME}] Unknown collection slug: "${slug}". It will be included in release-items options but may not exist.`,
        );
      }
    }

    const releasesCollection = buildReleasesCollection({
      access: access?.releases,
      hooks: {
        beforeChange: [releasesBeforeChange],
      },
    });

    const releaseItemsCollection = buildReleaseItemsCollection(
      enabledCollections,
      {
        access: access?.releaseItems,
        hooks: {
          beforeChange: [buildReleaseItemsBeforeChange()],
        },
      },
    );

    const endpoints: NonNullable<Config["endpoints"]> = [
      ...(config.endpoints ?? []),
      {
        path: "/content-releases/:id/publish",
        method: "post",
        handler: createPublishReleaseHandler({
          conflictStrategy: options.conflictStrategy ?? DEFAULT_CONFLICT_STRATEGY,
          publishBatchSize: options.publishBatchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
          hooks: options.hooks,
        }),
      },
      {
        path: "/content-releases/:id/conflicts",
        method: "get",
        handler: createCheckConflictsHandler(),
      },
    ];

    if (options.schedulerSecret) {
      endpoints.push({
        path: "/content-releases/run-scheduled",
        method: "get",
        handler: createRunScheduledHandler({
          secret: options.schedulerSecret,
          conflictStrategy: options.conflictStrategy ?? DEFAULT_CONFLICT_STRATEGY,
          publishBatchSize: options.publishBatchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
        }),
      });
    }

    // Patch enabled collections to inject sidebar UI field
    const patchedCollections = (config.collections ?? []).map((collection) => {
      if (!enabledCollections.includes(collection.slug)) return collection;
      return {
        ...collection,
        fields: [
          ...collection.fields,
          {
            name: "_releases",
            type: "ui" as const,
            admin: {
              position: "sidebar" as const,
              components: {
                Field: SIDEBAR_FIELD_PATH,
              },
            },
          },
        ],
      };
    });

    return {
      ...config,
      admin: {
        ...config.admin,
        custom: {
          ...(config.admin as any)?.custom,
          contentReleases: {
            enabledCollections,
          },
        },
      },
      collections: [
        ...patchedCollections,
        releasesCollection,
        releaseItemsCollection,
      ],
      endpoints,
    };
  };
}
