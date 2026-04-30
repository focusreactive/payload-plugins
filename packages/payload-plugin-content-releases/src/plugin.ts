import type { Config, Plugin } from "payload";
import type { ContentReleasesPluginConfig } from "./types";
import {
  PLUGIN_NAME,
  DEFAULT_CONFLICT_STRATEGY,
  DEFAULT_PUBLISH_BATCH_SIZE,
} from "./constants";

const SIDEBAR_FIELD_PATH =
  "@focus-reactive/payload-plugin-content-releases/client#ReleaseSidebarField";
import { buildReleasesCollection } from "./collections/releases";
import { buildReleaseItemsCollection } from "./collections/releaseItems";
import { releasesBeforeChange } from "./hooks/releasesBeforeChange";
import { releasesBeforeDelete } from "./hooks/releasesBeforeDelete";
import { buildReleaseItemsBeforeChange } from "./hooks/releaseItemsBeforeChange";
import { createPublishReleaseHandler } from "./endpoints/publishRelease";
import { createCheckConflictsHandler } from "./endpoints/checkConflicts";
import { createRunScheduledHandler } from "./endpoints/runScheduled";
import { createPreviewRollbackHandler } from "./endpoints/previewRollback";
import { createRollbackReleaseHandler } from "./endpoints/rollbackRelease";
import { createRefreshItemSnapshotHandler } from "./endpoints/refreshItemSnapshot";
import { checkScheduledReleases } from "./scheduler/checkScheduledReleases";

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
        beforeDelete: [releasesBeforeDelete],
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
          conflictStrategy:
            options.conflictStrategy ?? DEFAULT_CONFLICT_STRATEGY,
          publishBatchSize:
            options.publishBatchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
          hooks: options.hooks,
        }),
      },
      {
        path: "/content-releases/:id/conflicts",
        method: "get",
        handler: createCheckConflictsHandler(),
      },
      {
        path: "/content-releases/:id/rollback",
        method: "get",
        handler: createPreviewRollbackHandler(),
      },
      {
        path: "/content-releases/:id/rollback",
        method: "post",
        handler: createRollbackReleaseHandler({ hooks: options.hooks }),
      },
      {
        path: "/content-releases/items/:itemId/refresh-snapshot",
        method: "post",
        handler: createRefreshItemSnapshotHandler(),
      },
    ];

    if (options.schedulerSecret) {
      endpoints.push({
        path: "/content-releases/run-scheduled",
        method: "get",
        handler: createRunScheduledHandler({
          secret: options.schedulerSecret,
          conflictStrategy:
            options.conflictStrategy ?? DEFAULT_CONFLICT_STRATEGY,
          publishBatchSize:
            options.publishBatchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
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

    // Built-in scheduler via onInit
    const schedulerInterval = options.schedulerInterval;
    const schedulerEnabled =
      schedulerInterval !== false && schedulerInterval !== 0;
    const interval =
      typeof schedulerInterval === "number" ? schedulerInterval : 60000;

    const existingOnInit = config.onInit;

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
      onInit: async (payload) => {
        // Call existing onInit first
        if (existingOnInit) {
          await existingOnInit(payload);
        }

        if (schedulerEnabled) {
          payload.logger.info(
            `[${PLUGIN_NAME}] Scheduler started — checking scheduled releases every ${interval / 1000}s`,
          );

          setInterval(async () => {
            try {
              await checkScheduledReleases({
                payload,
                conflictStrategy:
                  options.conflictStrategy ?? DEFAULT_CONFLICT_STRATEGY,
                batchSize:
                  options.publishBatchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
              });
            } catch (err) {
              payload.logger.error(
                `[${PLUGIN_NAME}] Scheduler error: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }, interval);
        }
      },
    };
  };
}
