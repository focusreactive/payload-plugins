import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";
import { GetCollectionStatusHandler } from "./handler.js";
import type { GetCollectionStatusConfig } from "./model.js";
import type { TaskRunnerFactory, TaskRunner, Task } from "../../modules/task-runner/index.js";

const everyDocumentIsVisible = () =>
  vi.fn(async (args: { where?: { id?: { in?: string[] } } }) => ({
    docs: (args.where?.id?.in ?? []).map((id) => ({ id })),
  }));

describe("GetCollectionStatusHandler", () => {
  let handler: GetCollectionStatusHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerFactory;
  let config: GetCollectionStatusConfig;

  const createMockTask = ({
    targetLng = "de",
    collectionId = "doc-123",
    ...overrides
  }: Partial<Task> & { targetLng?: string; collectionId?: string } = {}): Task => ({
    id: "task-123",
    status: "completed",
    input: {
      collectionSlug: "posts" as CollectionSlug,
      collectionId,
      sourceLng: "en",
      targetLng,
      strategy: "overwrite",
      publishOnTranslation: false,
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T01:00:00Z",
    completedAt: "2024-01-01T01:00:00Z",
    cancelled: false,
    ...overrides,
  });

  const createMockRequest = (params: Record<string, string> = {}): PayloadRequest =>
    ({
      payload: { find: everyDocumentIsVisible() } as unknown as Payload,
      routeParams: params,
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    mockTaskRunner = {
      enqueue: vi.fn(),
      cancel: vi.fn(),
      run: vi.fn(),
      findByCollection: vi.fn().mockResolvedValue([]),
    };

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
    };

    config = {
      availableCollections: new Set(["posts", "pages"] as CollectionSlug[]),
    };

    handler = new GetCollectionStatusHandler(config, mockTaskRunnerFactory);
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

  describe("success responses", () => {
    it("returns empty docs array when no tasks exist", async () => {
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const req = createMockRequest({ collection_slug: "posts" });
      const response = await handler.handle(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual({ docs: [] });
    });

    it("asks which documents are visible once, not once per row", async () => {
      const find = everyDocumentIsVisible();
      const req = createMockRequest({ collection_slug: "posts" });
      (req as unknown as { payload: unknown }).payload = { find };
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([
        createMockTask({ id: "t1" }),
        createMockTask({ id: "t2" }),
        createMockTask({ id: "t3" }),
      ]);

      await handler.handle(req);

      expect(
        find,
        "Payload folds a read rule into the query, so three rows cost one question, not three"
      ).toHaveBeenCalledTimes(1);
    });

    it("returns task statuses for all documents in collection", async () => {
      const tasks = [
        createMockTask({ id: "run-1", status: "completed", targetLng: "de" }),
        createMockTask({ id: "run-1", status: "pending", targetLng: "fr" }),
        createMockTask({ id: "run-2", status: "running", targetLng: "de", collectionId: "doc-9" }),
      ];
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue(tasks);

      const req = createMockRequest({ collection_slug: "posts" });
      const response = await handler.handle(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(
        body.data.docs,
        "two of these share a run, so the handle alone cannot tell them apart"
      ).toEqual([
        { id: "run-1", status: "completed", collection_id: "doc-123", target_lng: "de" },
        { id: "run-1", status: "pending", collection_id: "doc-123", target_lng: "fr" },
        { id: "run-2", status: "running", collection_id: "doc-9", target_lng: "de" },
      ]);
    });

    it("calls findByCollection with correct collection slug", async () => {
      const req = createMockRequest({ collection_slug: "pages" });

      await handler.handle(req);

      expect(mockTaskRunner.findByCollection).toHaveBeenCalledWith("pages");
    });

    it("creates task runner with request payload", async () => {
      const mockPayload = {
        collections: {},
        find: everyDocumentIsVisible(),
      } as unknown as Payload;
      const req = createMockRequest({ collection_slug: "posts" });
      (req as any).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });
});
