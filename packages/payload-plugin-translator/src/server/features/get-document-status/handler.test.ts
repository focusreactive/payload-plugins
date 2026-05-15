import type { Payload, PayloadRequest, CollectionSlug } from "payload";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  TaskRunnerProvider,
  TaskRunner,
  Task,
} from "../../modules/task-runner";
import { GetDocumentStatusHandler } from "./handler";
import type { GetDocumentStatusConfig } from "./model";

describe("GetDocumentStatusHandler", () => {
  let handler: GetDocumentStatusHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerProvider;
  let config: GetDocumentStatusConfig;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    cancelled: false,
    completedAt: "2024-01-01T01:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    id: "task-123",
    input: {
      collectionId: "doc-123",
      collectionSlug: "posts" as CollectionSlug,
      publishOnTranslation: false,
      sourceLng: "en",
      strategy: "overwrite",
      targetLng: "de",
    },
    status: "completed",
    updatedAt: "2024-01-01T01:00:00Z",
    ...overrides,
  });

  const createMockRequest = (
    params: Record<string, string> = {}
  ): PayloadRequest =>
    ({
      payload: {} as Payload,
      routeParams: params,
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    mockTaskRunner = {
      cancel: vi.fn(),
      enqueue: vi.fn(),
      findByCollection: vi.fn().mockResolvedValue([]),
      run: vi.fn(),
    };

    mockTaskRunnerFactory = {
      configure: vi.fn(),
      create: vi.fn().mockReturnValue(mockTaskRunner),
    };

    config = {
      availableCollections: new Set(["posts", "pages"] as CollectionSlug[]),
    };

    handler = new GetDocumentStatusHandler(config, mockTaskRunnerFactory);
  });

  describe("validation", () => {
    it("returns validation error for missing collection_slug", async () => {
      const req = createMockRequest({ collection_id: "doc-123" });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Validation error");
    });

    it("returns validation error for missing collection_id", async () => {
      const req = createMockRequest({ collection_slug: "posts" });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });

    it("returns validation error for empty collection_slug", async () => {
      const req = createMockRequest({
        collection_id: "doc-123",
        collection_slug: "",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });
  });

  describe("collection availability", () => {
    it("returns bad request for unavailable collection", async () => {
      const req = createMockRequest({
        collection_id: "doc-123",
        collection_slug: "users",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Collection not available for translation");
    });
  });

  describe("success responses", () => {
    it("returns task status when task exists", async () => {
      const task = createMockTask();
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue([task]);

      const req = createMockRequest({
        collection_id: "doc-123",
        collection_slug: "posts",
      });
      const response = await handler.handle(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toMatchObject({
        id: "task-123",
        input: {
          collection: {
            relationTo: "posts",
            value: "doc-123",
          },
          source_lng: "en",
          target_lng: "de",
        },
        status: "completed",
      });
    });

    it("returns null when no task exists", async () => {
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const req = createMockRequest({
        collection_id: "doc-123",
        collection_slug: "posts",
      });
      const response = await handler.handle(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeNull();
    });

    it("calls findByCollection with correct parameters", async () => {
      const req = createMockRequest({
        collection_id: "doc-456",
        collection_slug: "posts",
      });

      await handler.handle(req);

      expect(mockTaskRunner.findByCollection).toHaveBeenCalledWith("posts", [
        "doc-456",
      ]);
    });

    it("creates task runner with request payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({
        collection_id: "doc-123",
        collection_slug: "posts",
      });
      (req as any).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe("task status transformation", () => {
    it("includes error information when present", async () => {
      const task = createMockTask({
        error: { message: "Translation failed" },
        status: "failed",
      });
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue([task]);

      const req = createMockRequest({
        collection_id: "doc-123",
        collection_slug: "posts",
      });
      const response = await handler.handle(req);

      const body = await response.json();
      expect(body.data.status).toBe("failed");
      expect(body.data.error).toEqual({ message: "Translation failed" });
    });

    it("includes cancelled flag", async () => {
      const task = createMockTask({ cancelled: true });
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue([task]);

      const req = createMockRequest({
        collection_id: "doc-123",
        collection_slug: "posts",
      });
      const response = await handler.handle(req);

      const body = await response.json();
      expect(body.data.cancelled).toBe(true);
    });
  });
});
