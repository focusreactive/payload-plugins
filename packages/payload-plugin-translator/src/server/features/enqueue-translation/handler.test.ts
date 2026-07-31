import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";
import { EnqueueTranslationHandler } from "./handler";
import type { EnqueueConfig } from "./model";
import type { TaskRunnerFactory, TaskRunner } from "../../modules/task-runner";

// Mock collection-utils
vi.mock("../_lib/collection-utils", () => ({
  isCollectionAvailable: vi.fn((slug: string, available: Set<string>) =>
    available.has(slug) ? slug : null
  ),
  getAllCollectionIds: vi.fn().mockResolvedValue(["doc-1", "doc-2", "doc-3"]),
}));

describe("EnqueueTranslationHandler", () => {
  let handler: EnqueueTranslationHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerFactory;
  let config: EnqueueConfig;
  const warn = vi.fn();

  // Bare request: no localization configured. Used for the validation, collection-availability, and
  // localization-guard paths — all of which reject before any locale resolution.
  const createMockRequest = (body: unknown): PayloadRequest =>
    ({
      payload: {} as Payload,
      json: vi.fn().mockResolvedValue(body),
    }) as unknown as PayloadRequest;

  // Request whose payload carries a configured locale set + logger. Translation is meaningless without
  // localization, so every success-path test runs against this.
  const createLocalizedRequest = (body: unknown): PayloadRequest =>
    ({
      payload: {
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
      cancel: vi.fn(),
      run: vi.fn(),
      findByCollection: vi.fn(),
    };

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
    };

    config = {
      availableCollections: new Set(["posts", "pages"] as CollectionSlug[]),
    };

    handler = new EnqueueTranslationHandler(config, mockTaskRunnerFactory);
  });

  describe("validation", () => {
    it("returns validation error for missing required fields", async () => {
      const req = createMockRequest({});

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });

    it("returns validation error for missing source_lng", async () => {
      const req = createMockRequest({
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });
  });

  describe("collection availability", () => {
    it("returns bad request for unavailable collection", async () => {
      const req = createMockRequest({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "users",
        collection_id: ["doc-1"],
        strategy: "overwrite",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain("not available for translation");
    });
  });

  describe("localization guard (D2)", () => {
    // Without localization there is no valid target locale: a phantom locale would either orphan rows
    // or, with no localization at all, overwrite the single unlocalized field — wiping the source.
    it("returns 400 and enqueues nothing when localization is not enabled", async () => {
      const req = createMockRequest({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["doc-1"],
        strategy: "overwrite",
      });

      const response = await handler.handle(req);

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
        strategy: "overwrite",
      });

      const response = await handler.handle(req);

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
        strategy: "skip_existing",
      });

      await handler.handle(req);

      expect(mockTaskRunner.enqueue).toHaveBeenCalledWith([
        {
          collectionSlug: "posts",
          collectionId: "doc-123",
          sourceLng: "en",
          targetLng: "fr",
          strategy: "skip_existing",
          publishOnTranslation: false,
        },
      ]);
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
        strategy: "overwrite",
      });
      (req as any).payload = mockPayload;

      await handler.handle(req);

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

      const response = await handler.handle(req);

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

      await handler.handle(req);

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

      await handler.handle(req);

      expect(enqueuedTasks().map((t: any) => t.targetLng)).toEqual(["de", "fr"]);
    });

    it("excludes the source locale from targets (AC6)", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: ["en", "de"],
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      await handler.handle(req);

      expect(enqueuedTasks().map((t: any) => t.targetLng)).toEqual(["de"]);
    });

    it("returns 400 when every requested locale is the source or unknown", async () => {
      const req = createLocalizedRequest({
        source_lng: "en",
        target_lng: ["en", "xx"],
        collection_slug: "posts",
        collection_id: ["doc-1"],
      });

      const response = await handler.handle(req);

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

      await handler.handle(req);

      expect(enqueuedTasks()).toEqual([
        {
          collectionSlug: "posts",
          collectionId: "doc-1",
          sourceLng: "en",
          targetLng: "de",
          strategy: "overwrite",
          publishOnTranslation: false,
        },
      ]);
    });
  });
});
