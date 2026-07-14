import type { CollectionSlug, Endpoint } from "payload";

import type { AccessGuard } from "../shared";
import type { TaskRunnerFactory } from "../modules/task-runner";
import type { CollectionSchemaMap } from "../../types/CollectionSchemaMap";
import type { ProvenanceStoreFactory } from "../modules/provenance";

import { createEnqueueRoute } from "./enqueue-translation";
import { createRunRoute } from "./run-translation";
import { createCancelRoute } from "./cancel";
import { createCancelByCollectionRoute } from "./cancel-by-collection";
import { createGetDocumentStatusRoute } from "./get-document-status";
import { createGetCollectionStatusRoute } from "./get-collection-status";
import { createGetDocumentStalenessRoute, createDismissStalenessRoute } from "./staleness";

export type TranslationRoutesDeps = {
  taskRunnerFactory: TaskRunnerFactory;
  /** Collections the plugin manages — gates which slugs the routes accept. */
  collectionConfig: { availableCollections: Set<CollectionSlug> };
  access?: AccessGuard;
  basePath?: string;
  /** Original per-collection field schema — needed to recompute source fingerprints for staleness. */
  schemaMap: CollectionSchemaMap;
  /** Builds a provenance store; absent when provenance is disabled (staleness then reports empty). */
  provenanceStoreFactory?: ProvenanceStoreFactory;
};

/**
 * The translator's HTTP surface as one shared bundle: the job-API endpoints
 * (enqueue / run / cancel / cancel-by-collection / document-status /
 * collection-status) plus the provenance-backed staleness endpoints
 * (document-staleness / dismiss), all wired to the same access guard.
 *
 * Extracted from the plugin's `init()` so registration is a single unit. The
 * document and collection levels each contribute this bundle via the level
 * context; the plugin deduplicates by method + path, so it registers exactly
 * once. The staleness endpoints always register; when provenance is disabled
 * (`provenanceStoreFactory` absent) they simply report no staleness.
 */
export function createTranslationRoutes({
  taskRunnerFactory,
  collectionConfig,
  access,
  basePath,
  schemaMap,
  provenanceStoreFactory,
}: TranslationRoutesDeps): Endpoint[] {
  const stalenessConfig = {
    availableCollections: collectionConfig.availableCollections,
    schemaMap,
    provenanceStoreFactory,
  };
  return [
    createEnqueueRoute(taskRunnerFactory, collectionConfig, access, basePath),
    createRunRoute(taskRunnerFactory, access, basePath),
    createCancelRoute(taskRunnerFactory, access, basePath),
    createCancelByCollectionRoute(collectionConfig, taskRunnerFactory, access, basePath),
    createGetDocumentStatusRoute(collectionConfig, taskRunnerFactory, access, basePath),
    createGetCollectionStatusRoute(collectionConfig, taskRunnerFactory, access, basePath),
    createGetDocumentStalenessRoute(stalenessConfig, access, basePath),
    createDismissStalenessRoute(stalenessConfig, access, basePath),
  ];
}
