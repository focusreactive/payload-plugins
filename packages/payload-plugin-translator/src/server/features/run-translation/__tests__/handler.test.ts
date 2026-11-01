import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest } from "payload";

import type { TaskRunnerFactory, TaskRunner } from "../../../modules/task-runner/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { RunTranslationHandler } = await import("../handler.js");

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
      findByHandles: vi
        .fn()
        .mockResolvedValue([
          runRow({ handle: "task-456", requesterId: "anna", requesterCollection: "users" }),
        ]),
    });

    handler = new RunTranslationHandler(mockTaskRunnerFactory, () => runs);
  });

  describe("validation", () => {
    it("returns validation error for missing id", async () => {
      const req = createMockRequest({});

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Validation error");
    });

    it("returns validation error for empty id", async () => {
      const req = createMockRequest({ id: "" });

      const response = await handler.handle(req);

      expect(response.status).toBe(400);
    });
  });

  describe("success responses", () => {
    it("returns 204 on successful run", async () => {
      (mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      const req = createMockRequest({ id: "task-123" });
      const response = await handler.handle(req);

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it("calls runner.run with correct task id", async () => {
      const req = createMockRequest({ id: "task-456" });

      await handler.handle(req);

      expect(mockTaskRunner.run).toHaveBeenCalledWith("task-456");
    });

    it("creates task runner with request payload", async () => {
      const mockPayload = { collections: {} } as Payload;
      const req = createMockRequest({ id: "task-123" });
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

      const req = createMockRequest({ id: "non-existent" });
      const response = await handler.handle(req);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("Queued task not found");
    });

    it("returns 404 when task already completed", async () => {
      (mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "already_completed",
      });

      const req = createMockRequest({ id: "completed-task" });
      const response = await handler.handle(req);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("Queued task not found");
    });

    it("returns 429 when task is already running", async () => {
      (mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "already_running",
      });

      const req = createMockRequest({ id: "running-task" });
      const response = await handler.handle(req);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.message).toBe("Translation task is already in progress");
    });
  });
  describe("a runner that cannot run a job on demand", () => {
    it("is answered rather than called, although this route is not registered for one", async () => {
      const cannotRun = { enqueue: vi.fn() } as unknown as TaskRunner;
      const handler = new RunTranslationHandler(
        { create: vi.fn().mockReturnValue(cannotRun), capabilities: { stop: false, run: false } },
        () => runs
      );

      const response = await handler.handle(createMockRequest({ id: "task-456" }));

      expect(response.status).toBe(501);
    });
  });
});
