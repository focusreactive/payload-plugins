import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";
import { GetDocumentStatusHandler } from "./handler";
import type { GetDocumentStatusConfig } from "./model";
import type { TaskRunnerFactory, TaskRunner, Task } from "../../modules/task-runner";
import { GENERIC_TRANSLATION_ERROR } from "../../shared";

describe("GetDocumentStatusHandler", () => {
  let handler: GetDocumentStatusHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerFactory;
  let config: GetDocumentStatusConfig;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: "task-123",
    status: "completed",
    input: {
      collectionSlug: "posts" as CollectionSlug,
      collectionId: "doc-123",
      sourceLng: "en",
      targetLng: "de",
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
      payload: {} as Payload,
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
        collection_slug: "",
        collection_id: "doc-123",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });
  });

  describe("collection availability", () => {
    it("returns bad request for unavailable collection", async () => {
      const req = createMockRequest({
        collection_slug: "users",
        collection_id: "doc-123",
      });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Collection not available for translation");
    });
  });

  describe("success responses", () => {
    it("returns one task status entry per document, wrapped in an array", async () => {
      const task = createMockTask();
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([task]);

      const req = createMockRequest({
        collection_slug: "posts",
        collection_id: "doc-123",
      });
      const response = await handler.handle(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        id: "task-123",
        status: "completed",
        input: {
          collection: {
            relationTo: "posts",
            value: "doc-123",
          },
          source_lng: "en",
          target_lng: "de",
        },
      });
    });

    it("returns one entry per target locale, keeping the latest job per locale", async () => {
      // Two locales, and a superseded older job for `de` — the reduction keeps the newest per locale.
      const deOld = createMockTask({
        id: "de-old",
        input: { ...createMockTask().input, targetLng: "de" },
        createdAt: "2024-01-01T00:00:00Z",
        status: "failed",
      });
      const deNew = createMockTask({
        id: "de-new",
        input: { ...createMockTask().input, targetLng: "de" },
        createdAt: "2024-01-02T00:00:00Z",
        status: "running",
      });
      const fr = createMockTask({
        id: "fr-1",
        input: { ...createMockTask().input, targetLng: "fr" },
        createdAt: "2024-01-01T12:00:00Z",
        status: "pending",
      });
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([
        deOld,
        deNew,
        fr,
      ]);

      const req = createMockRequest({ collection_slug: "posts", collection_id: "doc-123" });
      const body = await (await handler.handle(req)).json();

      const byLocale = Object.fromEntries(
        (body.data as Array<{ id: string; status: string; input: { target_lng: string } }>).map(
          (job) => [job.input.target_lng, job]
        )
      );
      expect(Object.keys(byLocale).sort()).toEqual(["de", "fr"]);
      expect(byLocale.de).toMatchObject({ id: "de-new", status: "running" });
      expect(byLocale.fr).toMatchObject({ id: "fr-1", status: "pending" });
    });

    it("returns an empty array when no task exists", async () => {
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const req = createMockRequest({
        collection_slug: "posts",
        collection_id: "doc-123",
      });
      const response = await handler.handle(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
    });

    it("calls findByCollection with correct parameters", async () => {
      const req = createMockRequest({
        collection_slug: "posts",
        collection_id: "doc-456",
      });

      await handler.handle(req);

      expect(mockTaskRunner.findByCollection).toHaveBeenCalledWith("posts", ["doc-456"]);
    });

    it("creates task runner with request payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({
        collection_slug: "posts",
        collection_id: "doc-123",
      });
      (req as any).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe("task status transformation", () => {
    it("includes error information when present", async () => {
      const task = createMockTask({
        status: "failed",
        error: { message: "Translation failed" },
      });
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([task]);

      const req = createMockRequest({
        collection_slug: "posts",
        collection_id: "doc-123",
      });
      const response = await handler.handle(req);

      const body = await response.json();
      expect(body.data[0].status).toBe("failed");
      expect(body.data[0].error).toEqual({ message: "Translation failed" });
    });

    it("does not leak the raw error to the client in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      try {
        const task = createMockTask({
          status: "failed",
          error: { message: "401 Incorrect API key provided: sk-proj-abc123" },
        });
        (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([task]);

        const req = createMockRequest({
          collection_slug: "posts",
          collection_id: "doc-123",
        });
        const body = await (await handler.handle(req)).json();

        expect(body.data[0].error).toEqual({ message: GENERIC_TRANSLATION_ERROR });
        expect(JSON.stringify(body)).not.toContain("sk-proj");
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("includes cancelled flag", async () => {
      const task = createMockTask({ cancelled: true });
      (mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([task]);

      const req = createMockRequest({
        collection_slug: "posts",
        collection_id: "doc-123",
      });
      const response = await handler.handle(req);

      const body = await response.json();
      expect(body.data[0].cancelled).toBe(true);
    });
  });
});
