import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest } from "payload";

import type { TaskRunner, TaskRunnerFactory } from "../../../modules/task-runner/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { CancelHandler } = await import("../handler.js");

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
      findByHandles: vi.fn(async (handles: string[]) =>
        handles.map((handle) =>
          runRow({ handle, requesterId: "anna", requesterCollection: "users" })
        )
      ),
    });

    handler = new CancelHandler(mockTaskRunnerFactory, () => runs);
  });

  describe("validation", () => {
    it("returns validation error for missing ids", async () => {
      const req = createMockRequest({});

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Validation error");
    });

    it("returns validation error for non-array ids", async () => {
      const req = createMockRequest({ ids: "not-an-array" });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });

    it("returns validation error for empty ids array", async () => {
      const req = createMockRequest({ ids: [] });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });
  });

  describe("success responses", () => {
    it("cancels tasks and returns 204", async () => {
      const req = createMockRequest({ ids: ["task-1", "task-2"] });

      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it("calls runner.stop with provided ids", async () => {
      const req = createMockRequest({ ids: ["task-1", "task-2", "task-3"] });

      await handler.handle(req);

      expect(mockTaskRunner.stop).toHaveBeenCalledWith(["task-1", "task-2", "task-3"]);
    });

    it("coerces numeric ids to strings (autoincrement DB ids)", async () => {
      // Admin client sends `{ ids: [1, 2] }` when the underlying DB uses
      // integer autoincrement (SQLite default). Schema must accept and
      // coerce, not reject with 400.
      const req = createMockRequest({ ids: [1, 2] });

      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(mockTaskRunner.stop).toHaveBeenCalledWith(["1", "2"]);
    });

    it("accepts a mix of numeric and string ids", async () => {
      const req = createMockRequest({ ids: [1, "uuid-abc"] });

      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(mockTaskRunner.stop).toHaveBeenCalledWith(["1", "uuid-abc"]);
    });

    it("creates task runner with request payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({ ids: ["task-1"] });
      (req as any).payload = mockPayload;

      await handler.handle(req);

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload);
    });

    it("places each handle through the run record, not through the runner", async () => {
      await handler.handle(createMockRequest({ ids: ["task-1", "task-2"] }));

      expect(
        runs.findByHandles,
        "the runner is asked to stop work, never asked what it holds"
      ).toHaveBeenCalledWith(["task-1", "task-2"]);
    });

    it("cancels nothing for a handle the record does not name", async () => {
      runs.findByHandles.mockResolvedValue([]);

      const response = await handler.handle(createMockRequest({ ids: ["a-stranger"] }));

      expect(response.status).toBe(204);
      expect(mockTaskRunner.stop).toHaveBeenCalledWith([]);
    });
  });
  describe("a runner that cannot stop work", () => {
    it("is answered rather than called, although this route is not registered for one", async () => {
      const cannotStop = { enqueue: vi.fn() } as unknown as TaskRunner;
      const handler = new CancelHandler(
        { create: vi.fn().mockReturnValue(cannotStop), capabilities: { stop: false, run: false } },
        () => runs
      );

      const response = await handler.handle(createMockRequest({ ids: ["task-1"] }));

      expect(response.status).toBe(501);
    });
  });
});
