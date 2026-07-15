import type { CollectionSlug, Endpoint } from "payload";

import type { TranslationContext } from "../modules/translation-levels";

import { createEnqueueRoute } from "./enqueue-translation";
import { createRunRoute } from "./run-translation";
import { createCancelRoute } from "./cancel";
import { createCancelByCollectionRoute } from "./cancel-by-collection";
import { createGetDocumentStatusRoute } from "./get-document-status";
import { createGetCollectionStatusRoute } from "./get-collection-status";
import { createGetDocumentStalenessRoute, createDismissStalenessRoute } from "./staleness";

export type TranslationRoutesDeps = Pick<
  TranslationContext,
  "taskRunnerFactory" | "access" | "provenanceServiceFactory"
> & {
  /** Collections the plugin manages — gates which slugs the routes accept. */
  collectionConfig: { availableCollections: Set<CollectionSlug> };
  basePath?: string;
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
 * (`provenanceServiceFactory` absent) they simply report no staleness.
 */
export function createTranslationRoutes({
  taskRunnerFactory,
  collectionConfig,
  access,
  basePath,
  provenanceServiceFactory,
}: TranslationRoutesDeps): Endpoint[] {
  const stalenessConfig = {
    availableCollections: collectionConfig.availableCollections,
    provenanceServiceFactory,
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
