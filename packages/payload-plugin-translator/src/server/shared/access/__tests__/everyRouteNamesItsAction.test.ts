import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug, Endpoint, PayloadRequest } from "payload";

import { createCancelRoute } from "../../../features/cancel/route.js";
import { createCancelByCollectionRoute } from "../../../features/cancel-by-collection/route.js";
import { createEnqueueRoute } from "../../../features/enqueue-translation/route.js";
import { createGetCollectionStatusRoute } from "../../../features/get-collection-status/route.js";
import { createGetDocumentStatusRoute } from "../../../features/get-document-status/route.js";
import { createRunRoute } from "../../../features/run-translation/route.js";
import {
  createDismissStalenessRoute,
  createGetDocumentStalenessRoute,
} from "../../../features/staleness/route.js";
import { createFieldRoute } from "../../../features/translate-field/route.js";
import type { TaskRunnerFactory } from "../../../modules/task-runner/index.js";
import type { ProvenanceServiceFactory } from "../../../modules/provenance/index.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TranslatorAction } from "../../../../types/TranslatorAction.js";
import type { AccessGuard } from "../types.js";
import { storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

const unreachable = (): never => {
  throw new Error("the guard refuses first, so nothing behind it may run");
};

const availableCollections = new Set<CollectionSlug>();
const taskRunnerFactory: TaskRunnerFactory = {
  create: unreachable,
  capabilities: { stop: true, run: true },
};
const provenanceServiceFactory: ProvenanceServiceFactory = unreachable;
const translationProvider: TranslationProvider = { translate: unreachable };
const schemaMap: CollectionSchemaMap = new Map();
const runRecordStoreFactory = () => storeDouble();

type RouteUnderTest = {
  readonly factory: string;
  readonly build: (access: AccessGuard) => Endpoint;
};

const routeForEveryAction: Record<TranslatorAction, RouteUnderTest> = {
  enqueue: {
    factory: "createEnqueueRoute",
    build: (access) =>
      createEnqueueRoute(
        taskRunnerFactory,
        runRecordStoreFactory,
        { availableCollections },
        access
      ),
  },
  run: {
    factory: "createRunRoute",
    build: (access) => createRunRoute(taskRunnerFactory, runRecordStoreFactory, access),
  },
  cancel: {
    factory: "createCancelRoute",
    build: (access) => createCancelRoute(taskRunnerFactory, runRecordStoreFactory, access),
  },
  "cancel-by-collection": {
    factory: "createCancelByCollectionRoute",
    build: (access) =>
      createCancelByCollectionRoute(
        { availableCollections },
        taskRunnerFactory,
        runRecordStoreFactory,
        access
      ),
  },
  "document-status": {
    factory: "createGetDocumentStatusRoute",
    build: (access) =>
      createGetDocumentStatusRoute({ availableCollections }, runRecordStoreFactory, access),
  },
  "collection-status": {
    factory: "createGetCollectionStatusRoute",
    build: (access) =>
      createGetCollectionStatusRoute(
        { availableCollections, failedWindowMs: 0 },
        runRecordStoreFactory,
        access
      ),
  },
  "document-staleness": {
    factory: "createGetDocumentStalenessRoute",
    build: (access) =>
      createGetDocumentStalenessRoute({ availableCollections, provenanceServiceFactory }, access),
  },
  "dismiss-staleness": {
    factory: "createDismissStalenessRoute",
    build: (access) =>
      createDismissStalenessRoute({ availableCollections, provenanceServiceFactory }, access),
  },
  "translate-field": {
    factory: "createFieldRoute",
    build: (access) => createFieldRoute({ access, schemaMap, translationProvider }),
  },
};

const refusingGuard = () => ({ check: vi.fn().mockReturnValue(false) });

const callIt = async (endpoint: Endpoint): Promise<void> => {
  const req = { headers: new Headers(), user: null, payload: {} } as unknown as PayloadRequest;
  await endpoint.handler(req);
};

describe("every route names its own action", () => {
  for (const [action, route] of Object.entries(routeForEveryAction) as Array<
    [TranslatorAction, RouteUnderTest]
  >) {
    it(`${route.factory} asks about "${action}"`, async () => {
      const access = refusingGuard();

      await callIt(route.build(access));

      expect(access.check).toHaveBeenCalledWith(expect.objectContaining({ action }));
    });

    it(`${route.factory} asks once`, async () => {
      const access = refusingGuard();

      await callIt(route.build(access));

      expect(access.check).toHaveBeenCalledTimes(1);
    });
  }
});
