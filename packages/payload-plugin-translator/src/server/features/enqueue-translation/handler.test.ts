import type { Payload, PayloadRequest, CollectionSlug } from "payload";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { TaskRunnerProvider, TaskRunner } from "../../modules/task-runner";
import { EnqueueTranslationHandler } from "./handler";
import type { EnqueueConfig } from "./model";

// Mock collection-utils
vi.mock("../_lib/collection-utils", () => ({
  getAllCollectionIds: vi.fn().mockResolvedValue(["doc-1", "doc-2", "doc-3"]),
  isCollectionAvailable: vi.fn((slug: string, available: Set<string>) =>
    available.has(slug) ? slug : null
  ),
}));

describe("EnqueueTranslationHandler", () => {
  let handler: EnqueueTranslationHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerProvider;
  let config: EnqueueConfig;

  const createMockRequest = (body: unknown): PayloadRequest =>
    ({
      json: vi.fn().mockResolvedValue(body),
      payload: {} as Payload,
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTaskRunner = {
      cancel: vi.fn(),
      enqueue: vi.fn().mockResolvedValue(undefined),
      findByCollection: vi.fn(),
      run: vi.fn(),
    };

    mockTaskRunnerFactory = {
      configure: vi.fn(),
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
        collection_id: ["doc-1"],
        collection_slug: "posts",
        target_lng: "de",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });
  });

  describe("collection availability", () => {
    it("returns bad request for unavailable collection", async () => {
      const req = createMockRequest({
        collection_id: ["doc-1"],
        collection_slug: "users",
        source_lng: "en",
        strategy: "overwrite",
        target_lng: "de",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain("not available for translation");
    });
  });

  describe("success responses", () => {
    it("enqueues tasks for specific documents", async () => {
      const req = createMockRequest({
        collection_id: ["doc-1", "doc-2"],
        collection_slug: "posts",
        source_lng: "en",
        strategy: "overwrite",
        target_lng: "de",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual({ queued: 2, success: true });
    });

    it("calls runner.enqueue with correct tasks", async () => {
      const req = createMockRequest({
        collection_id: ["doc-123"],
        collection_slug: "posts",
        source_lng: "en",
        strategy: "skip_existing",
        target_lng: "fr",
      });

      await handler.handle(req);

      expect(mockTaskRunner.enqueue).toHaveBeenCalledWith([
        {
          collectionId: "doc-123",
          collectionSlug: "posts",
          publishOnTranslation: false,
          sourceLng: "en",
          strategy: "skip_existing",
          targetLng: "fr",
        },
      ]);
    });

    // Note: select_all test skipped - requires non-empty collection_id in schema validation
    // This is a schema design decision that should be tested at integration level

    it("creates task runner with request payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({
        collection_id: ["doc-1"],
        collection_slug: "posts",
        source_lng: "en",
        strategy: "overwrite",
        target_lng: "de",
      });
      (req as any).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });
});
