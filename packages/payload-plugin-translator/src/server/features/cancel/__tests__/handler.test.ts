import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Payload, PayloadRequest } from "payload";

import type { TaskRunner, TaskRunnerFactory } from "../../../modules/task-runner/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { CancelHandler } = await import("../handler.js");

const AVAILABLE = { availableCollections: new Set<CollectionSlug>(["posts" as CollectionSlug]) };

const liveRun = (collectionId: string, handle: string) =>
  runRow({
    handle,
    collectionSlug: "posts",
    collectionId,
    requesterId: "anna",
    requesterCollection: "users",
  });

describe("CancelHandler", () => {
  let handler: InstanceType<typeof CancelHandler>;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerFactory;
  let runs: RunRecordStoreDouble;

  const createMockRequest = (body: unknown): PayloadRequest =>
    ({
      payload: {} as Payload,
      json: vi.fn().mockResolvedValue(body),
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    mockTaskRunner = {
      enqueue: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
    };

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
      capabilities: { stop: true, run: true },
    };

    runs = storeDouble({
      findLiveForDocuments: vi.fn(async (_slug: string, ids: readonly string[]) =>
        ids.map((id) => liveRun(id, `run-for-${id}`))
      ),
      findLiveInCollection: vi.fn(async () => [
        liveRun("1", "run-for-1"),
        liveRun("2", "run-for-2"),
        liveRun("3", "run-for-3"),
      ]),
    });

    handler = new CancelHandler(AVAILABLE, mockTaskRunnerFactory, () => runs);
  });

  describe("what a request must name", () => {
    it("refuses a body naming no collection", async () => {
      const response = await handler.handle(createMockRequest({ collection_id: ["1"] }));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Validation error");
    });

    it("refuses a body naming neither documents nor the whole collection", async () => {
      const response = await handler.handle(createMockRequest({ collection_slug: "posts" }));

      expect(response.status).toBe(400);
    });

    it("refuses an empty document list, because it names nothing to stop", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: [] })
      );

      expect(response.status).toBe(400);
    });

    it("refuses a document list that is not a list", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: "not-a-list" })
      );

      expect(response.status).toBe(400);
    });

    it("refuses a collection the plugin does not translate", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "invoices", collection_id: ["1"] })
      );

      expect(response.status).toBe(400);
      expect(mockTaskRunner.stop).not.toHaveBeenCalled();
    });
  });

  describe("cancelling the documents a request names", () => {
    it("stops the live runs of exactly those documents", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: ["42", "43"] })
      );

      expect(response.status).toBe(204);
      expect(runs.findLiveForDocuments).toHaveBeenCalledWith("posts", ["42", "43"]);
      expect(mockTaskRunner.stop).toHaveBeenCalledWith(["run-for-42", "run-for-43"]);
    });

    it("reads the live runs of those documents, never the whole collection", async () => {
      await handler.handle(createMockRequest({ collection_slug: "posts", collection_id: ["42"] }));

      expect(runs.findLiveInCollection).not.toHaveBeenCalled();
    });

    it("coerces a numeric document id, which is what an autoincrement database hands the admin", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: [1, 2] })
      );

      expect(response.status).toBe(204);
      expect(runs.findLiveForDocuments).toHaveBeenCalledWith("posts", ["1", "2"]);
    });

    it("answers 204 and stops nothing when no document named has a live run", async () => {
      runs.findLiveForDocuments.mockResolvedValue([]);

      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: ["42"] })
      );

      expect(response.status).toBe(204);
      expect(mockTaskRunner.stop).toHaveBeenCalledWith([]);
    });

    it("builds the runner from the request's own payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({ collection_slug: "posts", collection_id: ["42"] });
      (req as unknown as { payload: Payload }).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe("cancelling the whole collection", () => {
    it("stops every live run in it", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: ["42"], select_all: true })
      );

      expect(response.status).toBe(204);
      expect(runs.findLiveInCollection).toHaveBeenCalledWith("posts");
      expect(mockTaskRunner.stop).toHaveBeenCalledWith(["run-for-1", "run-for-2", "run-for-3"]);
    });

    it("ignores the documents the request listed, which are only what the caller could see", async () => {
      await handler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: ["42"], select_all: true })
      );

      expect(runs.findLiveForDocuments).not.toHaveBeenCalled();
    });

    it("needs no document list at all, which is how the collection panel asks", async () => {
      const response = await handler.handle(
        createMockRequest({ collection_slug: "posts", select_all: true })
      );

      expect(response.status).toBe(204);
      expect(runs.findLiveInCollection).toHaveBeenCalledWith("posts");
    });
  });

  describe("a runner that cannot stop work", () => {
    it("is answered rather than called, although this route is not registered for one", async () => {
      const cannotStop = { enqueue: vi.fn() } as unknown as TaskRunner;
      const cannotStopHandler = new CancelHandler(
        AVAILABLE,
        { create: vi.fn().mockReturnValue(cannotStop), capabilities: { stop: false, run: false } },
        () => runs
      );

      const response = await cannotStopHandler.handle(
        createMockRequest({ collection_slug: "posts", collection_id: ["42"] })
      );

      expect(response.status).toBe(501);
    });
  });
});
