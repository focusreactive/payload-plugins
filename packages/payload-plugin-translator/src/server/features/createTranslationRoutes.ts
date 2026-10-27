import type { CollectionSlug, Endpoint } from "payload";

import type { ConfigTimeContext } from "../modules/plugin-config/index.js";

import { createEnqueueRoute } from "./enqueue-translation/index.js";
import { createRunRoute } from "./run-translation/index.js";
import { createCancelRoute } from "./cancel/index.js";
import { createCancelByCollectionRoute } from "./cancel-by-collection/index.js";
import { createGetDocumentStatusRoute } from "./get-document-status/index.js";
import { createGetCollectionStatusRoute } from "./get-collection-status/index.js";

export type TranslationRoutesDeps = Pick<
  ConfigTimeContext,
  "taskRunnerFactory" | "runRecordStoreFactory" | "access" | "settings"
> & {
  /** Collections the plugin manages — gates which slugs the routes accept. */
  collectionConfig: { availableCollections: Set<CollectionSlug> };
};

export function createTranslationRoutes({
  taskRunnerFactory,
  runRecordStoreFactory,
  collectionConfig,
  access,
  settings,
}: TranslationRoutesDeps): Endpoint[] {
  const { basePath, failedWindowMs } = settings;
  const { stop, run } = taskRunnerFactory.capabilities;

  return [
    createEnqueueRoute(
      taskRunnerFactory,
      runRecordStoreFactory,
      collectionConfig,
      access,
      basePath
    ),
    ...(run ? [createRunRoute(taskRunnerFactory, runRecordStoreFactory, access, basePath)] : []),
    ...(stop
      ? [createCancelRoute(taskRunnerFactory, runRecordStoreFactory, access, basePath)]
      : []),
    ...(stop
      ? [
          createCancelByCollectionRoute(
            collectionConfig,
            taskRunnerFactory,
            runRecordStoreFactory,
            access,
            basePath
          ),
        ]
      : []),
    createGetDocumentStatusRoute(collectionConfig, runRecordStoreFactory, access, basePath),
    createGetCollectionStatusRoute(
      { ...collectionConfig, failedWindowMs },
      runRecordStoreFactory,
      access,
      basePath
    ),
  ];
}
