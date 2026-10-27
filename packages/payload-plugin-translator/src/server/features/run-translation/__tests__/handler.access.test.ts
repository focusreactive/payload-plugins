import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest } from "payload";

import type { CollectionSlug } from "payload";

import type { TaskRunner } from "../../../modules/task-runner/index.js";
import type { RunRecord } from "../../../modules/runs/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { RunTranslationHandler } = await import("../handler.js");
const { refusedTargets } = await import("../../../shared/access/refusedTargets.js");

const ANNA = { id: "anna", collection: "users" };
const MINE: RunRecord = runRow({
  handle: "job-1",
  collectionSlug: "posts" as CollectionSlug,
  collectionId: "d1",
  requesterId: "anna",
  requesterCollection: "users",
});

describe("POST /run/:id asks about the document behind the job", () => {
  let runner: TaskRunner;
  let handler: InstanceType<typeof RunTranslationHandler>;

  const request = (): PayloadRequest =>
    ({
      payload: {} as Payload,
      user: ANNA,
      routeParams: { id: "job-1" },
    }) as unknown as PayloadRequest;

  const answering = (rows: RunRecord[]) => {
    runner = {
      enqueue: vi.fn(),
      stop: vi.fn(),
      run: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as TaskRunner;
    const runs = storeDouble({ findByHandles: vi.fn().mockResolvedValue(rows) });
    handler = new RunTranslationHandler(
      { create: vi.fn().mockReturnValue(runner), capabilities: { stop: true, run: true } },
      () => runs
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set<string>());
  });

  it("refuses when the caller may not change the job's document", async () => {
    answering([MINE]);
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(["d1"]));

    const response = await handler.handle(request());

    expect(response.status).toBe(403);
    expect(runner.run).not.toHaveBeenCalled();
  });

  it("refuses a job nobody is recorded as having started", async () => {
    answering([{ ...MINE, requesterId: null, requesterCollection: null }]);

    const response = await handler.handle(request());

    expect(response.status).toBe(403);
    expect(runner.run).not.toHaveBeenCalled();
  });

  it("still answers 404 when the handle resolves to nothing", async () => {
    answering([]);

    const response = await handler.handle(request());

    expect(response.status).toBe(404);
  });

  it("runs the job for a caller the rule allows", async () => {
    answering([MINE]);

    const response = await handler.handle(request());

    expect(runner.run).toHaveBeenCalledWith("job-1");
    expect(response.status).toBe(204);
  });
});
