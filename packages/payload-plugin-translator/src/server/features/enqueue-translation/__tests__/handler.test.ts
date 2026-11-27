import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";
import { EnqueueTranslationHandler } from "../handler.js";
import type { EnqueueConfig } from "../model.js";
import type { TaskRunnerFactory, TaskRunner } from "../../../modules/task-runner/index.js";
import { storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../_lib/collection-utils.js", () => ({
  isCollectionAvailable: vi.fn((slug: string, available: Set<string>) =>
    available.has(slug) ? slug : null
  ),
}));

vi.mock("../../../shared/payload/collections.js", () => ({
  getAllCollectionIds: vi.fn().mockResolvedValue(["doc-1", "doc-2", "doc-3"]),
}));

const leaves = (...addresses: string[]) => [{ kind: "leaves", addresses }];

describe("EnqueueTranslationHandler", () => {
  let handler: EnqueueTranslationHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerFactory;
  let config: EnqueueConfig;
  const warn = vi.fn();

  const requestWithoutLocalization = (body: unknown): PayloadRequest =>
    ({
      payload: { collections: {} } as unknown as Payload,
      json: vi.fn().mockResolvedValue(body),
    }) as unknown as PayloadRequest;

  const createLocalizedRequest = (body: unknown): PayloadRequest =>
    ({
      payload: {
        collections: {
          posts: { config: { versions: { drafts: true } } },
          pages: { config: { versions: { drafts: true } } },
        },
        config: { localization: { locales: ["en", "de", "fr", "es"] } },
        logger: { warn },
      },
      json: vi.fn().mockResolvedValue(body),
    }) as unknown as PayloadRequest;

  const enqueuedTasks = () => (mockTaskRunner.enqueue as any).mock.calls[0][0];

  beforeEach(() => {
    vi.clearAllMocks();
    warn.mockClear();

    mockTaskRunner = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      run: vi.fn(),
    };

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
      capabilities: { stop: true, run: true },
      report: vi.fn(),
    };

    config = {
      availableCollections: new Set(["posts", "pages"] as CollectionSlug[]),
      canHoldText: () => true,
      holdsText: () => true,
    };

    handler = new EnqueueTranslationHandler(config, mockTaskRunnerFactory, () => storeDouble());
  });

  describe("locale validation", () => {
    // `source_lng` is only ever used to exclude itself from the target list, so an unconfigured code
    // used to travel straight through to `payload.findByID({ locale })` and read a locale the project
    // does not have.
    it("rejects a source locale the project does not have", async () => {
      const req = createLocalizedRequest({
        source_lng: "zz",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      const response = await handler.handleDocument(req);

      expect(response.status).toBe(400);
      expect(mockTaskRunner.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("returns validation error for missing required fields", async () => {
      const req = requestWithoutLocalization({});

      const response = await handler.handleDocument(req);

      expect(response.status).toBe(400);
    });

    it("returns validation error for missing source_lng", async () => {
      const req = requestWithoutLocalization({
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      const response = await handler.handleDocument(req);

      expect(response.status).toBe(400);
    });
  });

  describe("collection availability", () => {
    it("returns bad request for unavailable collection", async () => {
      const req = requestWithoutLocalization({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "users",
        collection_id: ["doc-1"],
      });

      const response = await handler.handleDocument(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain("not available for translation");
    });
  });

  describe("localization guard (D2)", () => {
    // Without localization there is no valid target locale: a phantom locale would either orphan rows
    // or, with no localization at all, overwrite the single unlocalized field — wiping the source.
    it("returns 400 and enqueues nothing when localization is not enabled", async () => {
      const req = requestWithoutLocalization({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      const response = await handler.handleDocument(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain("Localization is not enabled");
      expect(mockTaskRunner.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("success responses", () => {
    it("enqueues tasks for specific documents", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1", "doc-2"],
      });

      const response = await handler.handleList(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual({ success: true, queued: 2 });
    });

    it("calls runner.enqueue with correct tasks", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: "fr",
        collection_slug: "posts",
        collection_id: ["doc-123"],
      });

      await handler.handleDocument(req);

      expect(mockTaskRunner.enqueue).toHaveBeenCalledWith(
        [
          {
            collectionSlug: "posts",
            collectionId: "doc-123",
            sourceLng: "en",
            targetLng: "fr",
            filters: [],
            publishOnTranslation: false,
          },
        ],
        { requester: null }
      );
    });

    // Note: select_all test skipped - requires non-empty collection_id in schema validation
    // This is a schema design decision that should be tested at integration level

    it("creates task runner with request payload", async () => {
      const mockPayload = {
        collections: {},
        config: { localization: { locales: ["en", "de", "fr", "es"] } },
        logger: { warn },
      } as unknown as Payload;
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });
      (req as any).payload = mockPayload;

      await handler.handleDocument(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe("multi-target fan-out", () => {
    it("fans out one task per (document x target) — 2 docs x 2 targets = 4 (AC3)", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "posts",
        collection_id: ["doc-1", "doc-2"],
      });

      const response = await handler.handleList(req);

      expect(response.status).toBe(200);
      expect((await response.json()).data.queued).toBe(4);
      const tasks = enqueuedTasks();
      expect(tasks).toHaveLength(4);
      expect(tasks.map((t: any) => `${t.collectionId}:${t.targetLng}`)).toEqual([
        "doc-1:de",
        "doc-1:fr",
        "doc-2:de",
        "doc-2:fr",
      ]);
    });

    it("drops an unknown target locale, logs it, and still runs the valid one (AC4)", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: ["de", "xx"],
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      await handler.handleDocument(req);

      const tasks = enqueuedTasks();
      expect(tasks.map((t: any) => t.targetLng)).toEqual(["de"]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("xx");
    });

    it("de-dups duplicate targets to one task per locale (AC5)", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: ["de", "de", "fr"],
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      await handler.handleDocument(req);

      expect(enqueuedTasks().map((t: any) => t.targetLng)).toEqual(["de", "fr"]);
    });

    it("excludes the source locale from targets (AC6)", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: ["en", "de"],
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      await handler.handleDocument(req);

      expect(enqueuedTasks().map((t: any) => t.targetLng)).toEqual(["de"]);
    });

    it("returns 400 when every requested locale is the source or unknown", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: ["en", "xx"],
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      const response = await handler.handleDocument(req);

      expect(response.status).toBe(400);
      expect(mockTaskRunner.enqueue).not.toHaveBeenCalled();
    });

    it("keeps a scalar target working end-to-end when localization is configured (back-compat, AC1)", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      await handler.handleDocument(req);

      expect(enqueuedTasks()).toEqual([
        {
          collectionSlug: "posts",
          collectionId: "doc-1",
          sourceLng: "en",
          targetLng: "de",
          filters: [],
          publishOnTranslation: false,
        },
      ]);
    });
  });

  describe("filters", () => {
    const asked = (body: Record<string, unknown>) =>
      handler.handleDocument(
        createLocalizedRequest({
          source_lng: "en",
          target_lng: "de",
          collection_slug: "posts",
          collection_id: ["doc-1"],
          ...body,
        })
      );

    const askedOfTheList = (body: Record<string, unknown>) =>
      handler.handleList(
        createLocalizedRequest({
          source_lng: "en",
          target_lng: "de",
          collection_slug: "posts",
          collection_id: ["doc-1", "doc-2"],
          ...body,
        })
      );

    it("carries the addresses through to every task of the document it names", async () => {
      const response = await asked({
        target_lng: ["de", "fr"],
        filters: leaves("title", "content.#0.heading"),
      });

      const asksFor = leaves("title", "content.#0.heading");
      expect(response.status).toBe(200);
      expect(mockTaskRunner.enqueue).toHaveBeenCalledWith(
        [
          expect.objectContaining({ targetLng: "de", filters: asksFor }),
          expect.objectContaining({ targetLng: "fr", filters: asksFor }),
        ],
        expect.anything()
      );
    });

    it("refuses a body naming more than one document", async () => {
      const response = await asked({ collection_id: ["doc-1", "doc-2"] });

      expect(response.status).toBe(400);
      expect(mockTaskRunner.enqueue).not.toHaveBeenCalled();
    });

    it("refuses a whole-collection request on the single-document route", async () => {
      expect((await asked({ select_all: true })).status).toBe(400);
    });

    it("refuses addresses on the list route", async () => {
      expect((await askedOfTheList({ filters: leaves("title") })).status).toBe(400);
    });

    it("refuses addresses on the list route asking for the whole collection", async () => {
      const response = await askedOfTheList({ select_all: true, filters: leaves("title") });

      expect(response.status).toBe(400);
    });

    it("carries a rule through the list route", async () => {
      const response = await askedOfTheList({ filters: [{ kind: "rule", name: "stale" }] });

      expect(response.status).toBe(200);
    });

    it("refuses an empty leaves filter rather than reading it as nothing", async () => {
      const response = await asked({ filters: [{ kind: "leaves", addresses: [] }] });

      expect(response.status).toBe(400);
    });

    it("accepts an empty filter list, which asks for every translatable leaf", async () => {
      const response = await asked({ filters: [] });

      expect(response.status).toBe(200);
      expect(mockTaskRunner.enqueue).toHaveBeenCalledWith(
        [expect.objectContaining({ filters: [] })],
        expect.anything()
      );
    });
  });

  describe("asking for named fields where the write is live", () => {
    const requestHolding = (
      holding: readonly string[],
      body: Record<string, unknown>,
      collections: Record<string, unknown> = {}
    ) =>
      ({
        payload: {
          collections,
          config: { localization: { locales: ["en", "de", "fr", "es"] } },
          logger: { warn },
          find: vi.fn(async ({ locale }: { locale: string }) => ({
            docs: holding.includes(locale) ? [{ id: "doc-1" }] : [],
          })),
        },
        json: vi.fn().mockResolvedValue({
          source_lng: "en",
          target_lng: "de",
          collection_slug: "posts",
          collection_id: ["doc-1"],
          ...body,
        }),
      }) as unknown as PayloadRequest;

    const asked = (
      holding: readonly string[],
      body: Record<string, unknown>,
      collections?: Record<string, unknown>
    ) =>
      new EnqueueTranslationHandler(
        {
          availableCollections: config.availableCollections,
          canHoldText: () => true,
          holdsText: () => true,
        },
        mockTaskRunnerFactory,
        () => storeDouble()
      ).handleDocument(requestHolding(holding, body, collections));

    it("refuses a locale holding nothing, which the write would leave with empty required fields", async () => {
      const response = await asked([], { filters: leaves("title") });

      expect(response.status).toBe(400);
      expect((await response.json()).message).toContain("Nothing is written yet in de");
      expect(mockTaskRunner.enqueue).not.toHaveBeenCalled();
    });

    it("takes a locale that already holds content, whoever wrote it", async () => {
      const response = await asked(["de"], { filters: leaves("title") });

      expect(response.status).toBe(200);
      expect(mockTaskRunner.enqueue).toHaveBeenCalled();
    });

    it("decides per locale, and names only the one that holds nothing", async () => {
      const response = await asked(["de"], { target_lng: ["de", "fr"], filters: leaves("title") });

      expect(response.status).toBe(400);
      expect((await response.json()).message).toContain("Nothing is written yet in fr,");
    });

    it("takes a collection with nothing translatable, where no field could hold anything", async () => {
      const response = await new EnqueueTranslationHandler(
        {
          availableCollections: config.availableCollections,
          canHoldText: () => false,
          holdsText: () => false,
        },
        mockTaskRunnerFactory,
        () => storeDouble()
      ).handleDocument(requestHolding([], { filters: leaves("title") }));

      expect(response.status).toBe(200);
    });

    it("takes an empty locale where the collection keeps drafts, since a draft is not validated", async () => {
      const response = await asked(
        [],
        { filters: leaves("title") },
        {
          posts: { config: { versions: { drafts: true } } },
        }
      );

      expect(response.status).toBe(200);
    });

    it("takes a rule into an empty locale, which answers every leaf with no record to read", async () => {
      const response = await asked([], { filters: [{ kind: "rule", name: "stale" }] });

      expect(response.status).toBe(200);
    });

    it("takes the whole document", async () => {
      const response = await asked([], { filters: [] });

      expect(response.status).toBe(200);
    });
  });

  describe("a rule name", () => {
    const asked = (names: string[]) =>
      handler.handleList(
        createLocalizedRequest({
          source_lng: "en",
          target_lng: "de",
          collection_slug: "posts",
          collection_id: ["doc-1"],
          filters: names.map((name) => ({ kind: "rule", name })),
        })
      );

    it("queues an unknown rule name as given; the run resolves it against the criteria it has then", async () => {
      const response = await asked(["nobody-answers"]);

      expect(response.status).toBe(200);
      expect(mockTaskRunner.enqueue).toHaveBeenCalledWith(
        [expect.objectContaining({ filters: [{ kind: "rule", name: "nobody-answers" }] })],
        expect.anything()
      );
    });
  });
});
