import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Payload, PayloadRequest } from "payload";

import type { TaskRunner } from "../../../modules/task-runner/index.js";
import type { RunRecord } from "../../../modules/runs/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../_lib/collection-utils.js", () => ({
  isCollectionAvailable: vi.fn((slug: string, available: Set<string>) =>
    available.has(slug) ? slug : null
  ),
}));

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { CancelByCollectionHandler } = await import("../handler.js");
const { refusedTargets } = await import("../../../shared/access/refusedTargets.js");

const ANNA = { id: "anna", collection: "users" };

const queued = (handle: string, collectionId: string): RunRecord =>
  runRow({ handle, collectionSlug: "posts" as CollectionSlug, collectionId });

describe("DELETE /cancel-by-collection asks about each document it would cancel", () => {
  let runner: TaskRunner;
  let runs: RunRecordStoreDouble;
  let handler: InstanceType<typeof CancelByCollectionHandler>;

  const request = (): PayloadRequest =>
    ({
      payload: {} as Payload,
      user: ANNA,
      routeParams: { collection_slug: "posts" },
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set<string>());
    runner = {
      enqueue: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
    } as unknown as TaskRunner;
    runs = storeDouble({
      findLiveInCollection: vi
        .fn()
        .mockResolvedValue([queued("mine", "d1"), queued("theirs", "d2")]),
    });
    handler = new CancelByCollectionHandler(
      { availableCollections: new Set(["posts"] as CollectionSlug[]) },
      { create: vi.fn().mockReturnValue(runner), capabilities: { stop: true, run: true } },
      () => runs
    );
  });

  it("cancels no job whose document the caller may not change", async () => {
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(["d2"]));

    await handler.handle(request());

    expect(runner.stop).toHaveBeenCalledWith(["mine"]);
  });

  it("asks about the documents the rows name, for this caller", async () => {
    await handler.handle(request());

    expect(refusedTargets).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "posts", ids: ["d1", "d2"], user: ANNA })
    );
  });

  it("cancels nothing at all when every document is refused", async () => {
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Set(["d1", "d2"])
    );

    const response = await handler.handle(request());

    expect(runner.stop).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it("still cancels everything for a caller the rule allows", async () => {
    await handler.handle(request());

    expect(runner.stop).toHaveBeenCalledWith(["mine", "theirs"]);
  });
});
