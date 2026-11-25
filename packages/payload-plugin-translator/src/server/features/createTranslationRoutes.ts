import type { CollectionSlug, Endpoint } from "payload";

import type { ConfigTimeContext, ProvenanceAccess } from "../modules/plugin-config/index.js";
import type { SourceFingerprinter } from "../../core/domain/content-projection/sourceFingerprinter.js";
import type { TranslatableTextPresence } from "../../core/domain/content-projection/holdsTranslatableText.js";
import type { CollectionCanHoldText } from "./_lib/index.js";

import { createEnqueueListRoute, createEnqueueRoute } from "./enqueue-translation/index.js";
import { createRunRoute } from "./run-translation/index.js";
import { createCancelRoute } from "./cancel/index.js";
import { createGetDocumentStatusRoute } from "./get-document-status/index.js";
import { createGetCollectionStatusRoute } from "./get-collection-status/index.js";
import { createGetDocumentStateRoute } from "./get-document-state/index.js";
import { createGetListStateRoute } from "./get-list-state/index.js";

export type TranslationRoutesDeps = Pick<
  ConfigTimeContext,
  "taskRunnerFactory" | "runRecordStoreFactory" | "access" | "settings" | "schemaMap"
> & {
  /** What a state read needs to say how a locale stands against its source. */
  state: { fingerprintOf: SourceFingerprinter; provenance?: ProvenanceAccess };
  holdsText: TranslatableTextPresence;
  canHoldText: CollectionCanHoldText;
  collectionConfig: {
    availableCollections: Set<CollectionSlug>;
  };
};

export function createTranslationRoutes({
  taskRunnerFactory,
  runRecordStoreFactory,
  collectionConfig,
  schemaMap,
  state,
  holdsText,
  canHoldText,
  access,
  settings,
}: TranslationRoutesDeps): Endpoint[] {
  const { basePath, failedWindowMs } = settings;
  const { stop, run } = taskRunnerFactory.capabilities;
  const enqueueConfig = { ...collectionConfig, holdsText, canHoldText };

  return [
    createEnqueueRoute(taskRunnerFactory, runRecordStoreFactory, enqueueConfig, access, basePath),
    createEnqueueListRoute(
      taskRunnerFactory,
      runRecordStoreFactory,
      enqueueConfig,
      access,
      basePath
    ),
    ...(run
      ? [
          createRunRoute(
            collectionConfig,
            taskRunnerFactory,
            runRecordStoreFactory,
            access,
            basePath
          ),
        ]
      : []),
    ...(stop
      ? [
          createCancelRoute(
            collectionConfig,
            taskRunnerFactory,
            runRecordStoreFactory,
            access,
            basePath
          ),
        ]
      : []),
    createGetDocumentStatusRoute(collectionConfig, runRecordStoreFactory, access, basePath),
    createGetDocumentStateRoute(
      { ...collectionConfig, schemaMap, holdsText, ...state },
      runRecordStoreFactory,
      access,
      basePath
    ),
    createGetCollectionStatusRoute(
      { ...collectionConfig, failedWindowMs },
      runRecordStoreFactory,
      access,
      basePath
    ),
    createGetListStateRoute(
      { ...collectionConfig, failedWindowMs, holdsText, ...state },
      runRecordStoreFactory,
      access,
      basePath
    ),
  ];
}
