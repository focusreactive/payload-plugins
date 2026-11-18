import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest } from "payload";

import type { CollectionSlug } from "payload";

import type { TaskRunnerFactory, TaskRunner } from "../../../modules/task-runner/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { RunTranslationHandler } = await import("../handler.js");

const AVAILABLE = { availableCollections: new Set<CollectionSlug>(["posts" as CollectionSlug]) };

describe("RunTranslationHandler", () => {
  let handler: InstanceType<typeof RunTranslationHandler>;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerFactory;
  let runs: RunRecordStoreDouble;

  const createMockRequest = (params: Record<string, string> = {}): PayloadRequest =>
    ({
      payload: {} as Payload,
      routeParams: params,
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    mockTaskRunner = {
      enqueue: vi.fn(),
      stop: vi.fn(),
      run: vi.fn().mockResolvedValue({ success: true }),
    };

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
      capabilities: { stop: true, run: true },
    };

    runs = storeDouble({
      findByDocument: vi.fn().mockResolvedValue([
        runRow({
          handle: "task-456",
          collectionSlug: "posts",
          collectionId: "42",
          requesterId: "anna",
          requesterCollection: "users",
        }),
      ]),
    });

    handler = new RunTranslationHandler(AVAILABLE, mockTaskRunnerFactory, () => runs);
  });

  describe("what the address must name", () => {
    it("refuses a request naming no document", async () => {
      const response = await handler.handle(createMockRequest({ collection_slug: "posts" }));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Validation error");
    });

    it("refuses an empty document id", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: "" })
      );

      expect(response.status).toBe(400);
    });

    it("refuses a collection the plugin does not translate", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "invoices", collection_id: "42" })
      );

      expect(response.status).toBe(400);
      expect(mockTaskRunner.run).not.toHaveBeenCalled();
    });

    it("answers 404 for a document with no live run, rather than succeeding quietly", async () => {
      runs.findByDocument.mockResolvedValue([]);

      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: "99" })
      );

      expect(response.status).toBe(404);
      expect(mockTaskRunner.run).not.toHaveBeenCalled();
    });

    it("reaches a run that has already settled, because Retry is offered on one that failed", async () => {
      runs.findByDocument.mockResolvedValue([
        runRow({
          handle: "spent-run",
          collectionSlug: "posts",
          collectionId: "42",
          requesterId: "anna",
          requesterCollection: "users",
          settledAt: "2026-11-17T10:00:00.000Z",
          outcome: "failed",
        }),
      ]);

      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: "42" })
      );

      expect(response.status).toBe(204);
      expect(mockTaskRunner.run).toHaveBeenCalledWith("spent-run");
    });
  });

  describe("success responses", () => {
    it("returns 204 on successful run", async () => {
      (mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      const req = createMockRequest({ collection_slug: "posts", collection_id: "42" });
      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it("runs the handle the record holds for that document, which the caller never names", async () => {
      const req = createMockRequest({ collection_slug: "posts", collection_id: "42" });

      await handler.handle(req);

      expect(runs.findByDocument).toHaveBeenCalledWith({
        collectionSlug: "posts",
        collectionId: "42",
      });
      expect(mockTaskRunner.run).toHaveBeenCalledWith("task-456");
    });

    it("creates task runner with request payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({ collection_slug: "posts", collection_id: "42" });
      (req as any).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe("error responses", () => {
    it("returns 404 when task not found", async () => {
      (mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "not_found",
      });

      const req = createMockRequest({ collection_slug: "posts", collection_id: "42" });
      const response = await handler.handle(req);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("No run found for this document");
    });

    it("returns 404 when task already completed", async () => {
      (mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "already_completed",
      });

      const req = createMockRequest({ collection_slug: "posts", collection_id: "42" });
      const response = await handler.handle(req);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("No run found for this document");
    });

    it("returns 429 when task is already running", async () => {
      (mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "already_running",
      });

      const req = createMockRequest({ collection_slug: "posts", collection_id: "42" });
      const response = await handler.handle(req);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.message).toBe("Translation task is already in progress");
    });
  });
  describe("a runner that cannot start a run on demand", () => {
    it("is answered rather than called, although this route is not registered for one", async () => {
      const cannotRun = { enqueue: vi.fn() } as unknown as TaskRunner;
      const handler = new RunTranslationHandler(
        AVAILABLE,
        { create: vi.fn().mockReturnValue(cannotRun), capabilities: { stop: false, run: false } },
        () => runs
      );

      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: "42" })
      );

      expect(response.status).toBe(501);
    });
  });
});
