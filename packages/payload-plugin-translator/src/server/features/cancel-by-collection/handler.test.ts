import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";

import { CancelByCollectionHandler } from "./handler.js";
import type { CancelConfig } from "./model.js";
import type { TaskRunnerFactory, TaskRunner } from "../../modules/task-runner/index.js";
import { runRow, storeDouble } from "../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../modules/runs/__tests__/fixtures/runRecordStore.js";

const STARTED = "2026-10-27T10:01:00.000Z";

describe("CancelByCollectionHandler", () => {
  let handler: CancelByCollectionHandler;
  let mockTaskRunner: TaskRunner;
  let mockTaskRunnerFactory: TaskRunnerFactory;
  let runs: RunRecordStoreDouble;
  let config: CancelConfig;

  const request = (params: Record<string, string> = {}): PayloadRequest =>
    ({
      payload: {} as Payload,
      routeParams: params,
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
    runs = storeDouble();
    config = { availableCollections: new Set(["posts", "pages"] as CollectionSlug[]) };

    handler = new CancelByCollectionHandler(config, mockTaskRunnerFactory, () => runs);
  });

  describe("validation", () => {
    it("refuses a request naming no collection", async () => {
      const response = await handler.handle(request({}));

      expect(response.status).toBe(400);
      expect((await response.json()).message).toBe("Validation error");
    });

    it("refuses a collection the plugin does not translate", async () => {
      const response = await handler.handle(request({ collection_slug: "users" }));

      expect(response.status).toBe(400);
      expect((await response.json()).message).toBe("Collection not available for translation");
    });
  });

  describe("nothing to stop", () => {
    it("answers 204 when the collection has nothing in flight", async () => {
      const response = await handler.handle(request({ collection_slug: "posts" }));

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
      expect(mockTaskRunner.stop).not.toHaveBeenCalled();
    });

    it("answers 204 when every run has already started", async () => {
      runs.findLiveInCollection.mockResolvedValue([
        runRow({ handle: "run-1", startedAt: STARTED }),
        runRow({ handle: "run-2", startedAt: STARTED }),
      ]);

      const response = await handler.handle(request({ collection_slug: "posts" }));

      expect(response.status).toBe(204);
      expect(mockTaskRunner.stop).not.toHaveBeenCalled();
    });
  });

  describe("stopping what has not started", () => {
    it("stops every queued run and leaves the one in flight alone", async () => {
      runs.findLiveInCollection.mockResolvedValue([
        runRow({ handle: "run-1" }),
        runRow({ handle: "run-2", startedAt: STARTED }),
        runRow({ handle: "run-3" }),
      ]);

      const response = await handler.handle(request({ collection_slug: "posts" }));

      expect(response.status).toBe(204);
      expect(mockTaskRunner.stop).toHaveBeenCalledWith(["run-1", "run-3"]);
    });

    it("protects a whole run when one of its locales has started", async () => {
      runs.findLiveInCollection.mockResolvedValue([
        runRow({ handle: "run-1", targetLng: "de", startedAt: STARTED }),
        runRow({ handle: "run-1", targetLng: "fr" }),
      ]);

      await handler.handle(request({ collection_slug: "posts" }));

      expect(
        mockTaskRunner.stop,
        "stopping the run would abandon the locale already being written"
      ).not.toHaveBeenCalled();
    });

    it("names each run once, however many locale rows it has", async () => {
      runs.findLiveInCollection.mockResolvedValue([
        runRow({ handle: "run-1", targetLng: "de" }),
        runRow({ handle: "run-1", targetLng: "fr" }),
      ]);

      await handler.handle(request({ collection_slug: "posts" }));

      expect(mockTaskRunner.stop).toHaveBeenCalledWith(["run-1"]);
    });

    it("asks the record what the collection has in flight", async () => {
      await handler.handle(request({ collection_slug: "pages" }));

      expect(
        runs.findLiveInCollection,
        "what the collection has in flight is the record's to answer, not the runner's"
      ).toHaveBeenCalledWith("pages");
    });

    it("creates the runner with the request's own payload", async () => {
      const payload = { collections: {} } as Payload;
      const req = request({ collection_slug: "posts" });
      (req as unknown as { payload: Payload }).payload = payload;
      runs.findLiveInCollection.mockResolvedValue([runRow({ handle: "run-1" })]);

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(payload);
    });
  });
});
