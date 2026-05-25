import type { Payload, PayloadRequest, CollectionSlug } from "payload";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  TaskRunnerProvider,
  TaskRunner,
  Task,
} from "../../modules/task-runner";
import { CancelByCollectionHandler } from "./handler";
import type { CancelConfig } from "./model";

describe("CancelByCollectionHandler", () => {
  let handler: CancelByCollectionHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerProvider;
  let config: CancelConfig;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    cancelled: false,
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
    status: "pending",
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
      cancel: vi.fn().mockResolvedValue(undefined),
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

    handler = new CancelByCollectionHandler(config, mockTaskRunnerFactory);
  });

  describe("validation", () => {
    it("returns validation error for missing collection_slug", async () => {
      const req = createMockRequest({});

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Validation error");
    });

    it("returns validation error for empty collection_slug", async () => {
      const req = createMockRequest({ collection_slug: "" });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });
  });

  describe("collection availability", () => {
    it("returns bad request for unavailable collection", async () => {
      const req = createMockRequest({ collection_slug: "users" });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Collection not available for translation");
    });
  });

  describe("no tasks to cancel", () => {
    it("returns 204 when no tasks exist for collection", async () => {
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const req = createMockRequest({ collection_slug: "posts" });
      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it("returns 204 when all tasks are already completed", async () => {
      const tasks = [
        createMockTask({ id: "task-1", status: "completed" }),
        createMockTask({ id: "task-2", status: "failed" }),
      ];
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue(tasks);

      const req = createMockRequest({ collection_slug: "posts" });
      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(mockTaskRunner.cancel).not.toHaveBeenCalled();
    });

    it("returns 204 when all tasks are running (not pending)", async () => {
      const tasks = [
        createMockTask({ id: "task-1", status: "running" }),
        createMockTask({ id: "task-2", status: "running" }),
      ];
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue(tasks);

      const req = createMockRequest({ collection_slug: "posts" });
      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(mockTaskRunner.cancel).not.toHaveBeenCalled();
    });
  });

  describe("cancelling pending tasks", () => {
    it("cancels only pending tasks", async () => {
      const tasks = [
        createMockTask({ id: "task-1", status: "pending" }),
        createMockTask({ id: "task-2", status: "running" }),
        createMockTask({ id: "task-3", status: "pending" }),
        createMockTask({ id: "task-4", status: "completed" }),
      ];
      (
        mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>
      ).mockResolvedValue(tasks);

      const req = createMockRequest({ collection_slug: "posts" });
      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(mockTaskRunner.cancel).toHaveBeenCalledWith(["task-1", "task-3"]);
    });

    it("calls findByCollection with correct collection slug", async () => {
      const req = createMockRequest({ collection_slug: "pages" });

      await handler.handle(req);

      expect(mockTaskRunner.findByCollection).toHaveBeenCalledWith("pages");
    });

    it("creates task runner with request payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({ collection_slug: "posts" });
      (req as any).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });
});
