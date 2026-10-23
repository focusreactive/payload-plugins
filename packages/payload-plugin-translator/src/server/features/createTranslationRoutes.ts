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
  "taskRunnerFactory" | "access" | "settings"
> & {
  /** Collections the plugin manages — gates which slugs the routes accept. */
  collectionConfig: { availableCollections: Set<CollectionSlug> };
};

export function createTranslationRoutes({
  taskRunnerFactory,
  collectionConfig,
  access,
  settings,
}: TranslationRoutesDeps): Endpoint[] {
  const { basePath, failedWindowMs } = settings;
  return [
    createEnqueueRoute(taskRunnerFactory, collectionConfig, access, basePath),
    createRunRoute(taskRunnerFactory, access, basePath),
    createCancelRoute(taskRunnerFactory, access, basePath),
    createCancelByCollectionRoute(collectionConfig, taskRunnerFactory, access, basePath),
    createGetDocumentStatusRoute(collectionConfig, taskRunnerFactory, access, basePath),
    createGetCollectionStatusRoute(
      { ...collectionConfig, failedWindowMs },
      taskRunnerFactory,
      access,
      basePath
    ),
  ];
}
