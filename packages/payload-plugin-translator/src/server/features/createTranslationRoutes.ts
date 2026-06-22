import type { CollectionSlug, Endpoint } from "payload";

import type { AccessGuard } from "../shared";
import type { TaskRunnerFactory } from "../modules/task-runner";

import { createEnqueueRoute } from "./enqueue-translation";
import { createRunRoute } from "./run-translation";
import { createCancelRoute } from "./cancel";
import { createCancelByCollectionRoute } from "./cancel-by-collection";
import { createGetDocumentStatusRoute } from "./get-document-status";
import { createGetCollectionStatusRoute } from "./get-collection-status";

export type TranslationRoutesDeps = {
  taskRunnerFactory: TaskRunnerFactory;
  /** Collections the plugin manages — gates which slugs the routes accept. */
  collectionConfig: { availableCollections: Set<CollectionSlug> };
  access?: AccessGuard;
  basePath?: string;
};

/**
 * The translator's HTTP surface as one shared bundle: the 6 job-API endpoints
 * (enqueue / run / cancel / cancel-by-collection / document-status /
 * collection-status), all wired to the same runner factory and access guard.
 *
 * Extracted from the plugin's `init()` so registration is a single unit. The
 * document and collection levels each contribute this bundle via the level
 * context; the plugin deduplicates by method + path, so it registers exactly
 * once. Behaviour-preserving: same endpoints, same order, same wiring.
 */
export function createTranslationRoutes({
  taskRunnerFactory,
  collectionConfig,
  access,
  basePath,
}: TranslationRoutesDeps): Endpoint[] {
  return [
    createEnqueueRoute(taskRunnerFactory, collectionConfig, access, basePath),
    createRunRoute(taskRunnerFactory, access, basePath),
    createCancelRoute(taskRunnerFactory, access, basePath),
    createCancelByCollectionRoute(collectionConfig, taskRunnerFactory, access, basePath),
    createGetDocumentStatusRoute(collectionConfig, taskRunnerFactory, access, basePath),
    createGetCollectionStatusRoute(collectionConfig, taskRunnerFactory, access, basePath),
  ];
}
