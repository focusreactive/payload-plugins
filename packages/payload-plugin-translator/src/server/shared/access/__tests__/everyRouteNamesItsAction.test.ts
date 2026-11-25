import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug, Endpoint, PayloadRequest } from "payload";

import { createCancelRoute } from "../../../features/cancel/route.js";
import {
  createEnqueueListRoute,
  createEnqueueRoute,
} from "../../../features/enqueue-translation/route.js";
import { createGetCollectionStatusRoute } from "../../../features/get-collection-status/route.js";
import { createGetDocumentStateRoute } from "../../../features/get-document-state/route.js";
import { createGetListStateRoute } from "../../../features/get-list-state/route.js";
import { createGetDocumentStatusRoute } from "../../../features/get-document-status/route.js";
import { createRunRoute } from "../../../features/run-translation/route.js";
import {
  createDismissStalenessRoute,
  createGetDocumentStalenessRoute,
} from "../../../features/staleness/route.js";
import { createFieldRoute } from "../../../features/translate-field/route.js";
import type { TaskRunnerFactory } from "../../../modules/task-runner/index.js";
import type { DocumentStalenessFactory } from "../../../modules/provenance/index.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TranslatorAction } from "../../../../types/TranslatorAction.js";
import type { AccessGuard } from "../types.js";
import { storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import { translationLanguages } from "../../../features/_lib/index.js";

const unreachable = (): never => {
  throw new Error("the guard refuses first, so nothing behind it may run");
};

const availableCollections = new Set<CollectionSlug>();
const taskRunnerFactory: TaskRunnerFactory = {
  create: unreachable,
  capabilities: { stop: true, run: true },
  report: vi.fn(),
};
const stalenessFactory: DocumentStalenessFactory = unreachable;
const translationProvider: TranslationProvider = { translate: unreachable };
const schemaMap: CollectionSchemaMap = new Map();
const runRecordStoreFactory = () => storeDouble();

type RouteUnderTest = {
  readonly factory: string;
  readonly build: (access: AccessGuard) => Endpoint;
};

const enqueueListRoute = (access: AccessGuard): Endpoint =>
  createEnqueueListRoute(
    taskRunnerFactory,
    runRecordStoreFactory,
    { availableCollections, canHoldText: () => false, holdsText: () => false },
    access
  );

const aRequest = (): PayloadRequest =>
  ({ headers: new Headers(), user: null, payload: {} }) as unknown as PayloadRequest;

const NO_ROUTE_ASKS_IT = null;

const routeForEveryAction: Record<TranslatorAction, RouteUnderTest | null> = {
  enqueue: {
    factory: "createEnqueueRoute",
    build: (access) =>
      createEnqueueRoute(
        taskRunnerFactory,
        runRecordStoreFactory,
        { availableCollections, canHoldText: () => false, holdsText: () => false },
        access
      ),
  },
  "enqueue-list": { factory: "createEnqueueListRoute", build: enqueueListRoute },
  run: {
    factory: "createRunRoute",
    build: (access) =>
      createRunRoute({ availableCollections }, taskRunnerFactory, runRecordStoreFactory, access),
  },
  cancel: {
    factory: "createCancelRoute",
    build: (access) =>
      createCancelRoute({ availableCollections }, taskRunnerFactory, runRecordStoreFactory, access),
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
      createGetDocumentStalenessRoute({ availableCollections, stalenessFactory }, access),
  },
  "dismiss-staleness": {
    factory: "createDismissStalenessRoute",
    build: (access) =>
      createDismissStalenessRoute({ availableCollections, stalenessFactory }, access),
  },
  /** Its route folded into `cancel`; the action stays published until the next major so that a host
   * guard already answering for it keeps working. */
  "cancel-by-collection": NO_ROUTE_ASKS_IT,
  "translate-field": {
    factory: "createFieldRoute",
    build: (access) =>
      createFieldRoute({ access, schemaMap, translationProvider, walk: translationLanguages() }),
  },
};

const refusingGuard = () => ({ check: vi.fn().mockReturnValue(false) });

const callIt = async (endpoint: Endpoint): Promise<void> => {
  await endpoint.handler(aRequest());
};

describe("every route names its own action", () => {
  const routed = Object.entries(routeForEveryAction).filter(
    (entry): entry is [TranslatorAction, RouteUnderTest] => entry[1] !== null
  );

  it("leaves exactly one published action without a route of its own", () => {
    const unrouted = Object.entries(routeForEveryAction)
      .filter(([, route]) => route === null)
      .map(([action]) => action);

    expect(unrouted).toEqual(["cancel-by-collection"]);
  });

  for (const [action, route] of routed) {
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

describe("a read that answers better does not add an action", () => {
  it("guards the document-state route with the action its panel already asks about", async () => {
    const access = refusingGuard();

    await callIt(
      createGetDocumentStateRoute(
        {
          availableCollections,
          schemaMap,
          fingerprintOf: () => null,
          holdsText: () => false,
          failedWindowMs: 0,
        },
        runRecordStoreFactory,
        access
      )
    );

    expect(access.check).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document-status" })
    );
  });

  it("guards the list-state route with the action its list already asks about", async () => {
    const access = refusingGuard();

    await callIt(
      createGetListStateRoute(
        { availableCollections, failedWindowMs: 0, holdsText: () => false },
        runRecordStoreFactory,
        access
      )
    );

    expect(access.check).toHaveBeenCalledWith(
      expect.objectContaining({ action: "collection-status" })
    );
  });
});

const answersOnly = (allowed: TranslatorAction): AccessGuard => ({
  check: ({ action }) => action === allowed,
});

describe("a guard may permit one enqueue route and refuse the other", () => {
  it("refuses the list route for a guard that names only the single-document action", async () => {
    const response = await enqueueListRoute(answersOnly("enqueue")).handler(aRequest());

    expect(
      response.status,
      "nothing behind the guard may run, so the doubles throw if it does"
    ).toBe(403);
  });
});
