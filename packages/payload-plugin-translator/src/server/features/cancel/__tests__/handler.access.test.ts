import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest } from "payload";

import type { CollectionSlug } from "payload";

import type { TaskRunner } from "../../../modules/task-runner/index.js";
import type { RunRecord } from "../../../modules/runs/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { CancelHandler } = await import("../handler.js");
const { refusedTargets } = await import("../../../shared/access/refusedTargets.js");

const ANNA = { id: "anna", collection: "users" };

const rowFor = (handle: string, collectionId: string): RunRecord =>
  runRow({
    handle,
    collectionSlug: "posts" as CollectionSlug,
    collectionId,
    requesterId: "anna",
    requesterCollection: "users",
  });

describe("DELETE /cancel asks about the documents behind the handles", () => {
  let runner: TaskRunner;
  let runs: RunRecordStoreDouble;
  let handler: InstanceType<typeof CancelHandler>;

  const request = (ids: string[]): PayloadRequest =>
    ({
      payload: {} as Payload,
      user: ANNA,
      json: vi.fn().mockResolvedValue({ ids }),
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
      findByHandles: vi.fn().mockResolvedValue([rowFor("mine", "d1"), rowFor("theirs", "d2")]),
    });
    handler = new CancelHandler(
      { create: vi.fn().mockReturnValue(runner), capabilities: { stop: true, run: true } },
      () => runs
    );
  });

  it("cancels only the handles whose document the caller may change", async () => {
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(["d2"]));

    await handler.handle(request(["mine", "theirs"]));

    expect(runner.stop).toHaveBeenCalledWith(["mine"]);
  });

  it("names the refused handles", async () => {
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(["d2"]));

    const body = await (await handler.handle(request(["mine", "theirs"]))).json();

    expect(body).toMatchObject({ data: { refused: ["theirs"] } });
  });

  it("answers 204 with no body when nothing was refused", async () => {
    const response = await handler.handle(request(["mine", "theirs"]));

    expect(response.status).toBe(204);
    expect(runner.stop).toHaveBeenCalledWith(["mine", "theirs"]);
  });

  it("never cancels a handle the record could not place", async () => {
    runs.findByHandles.mockResolvedValue([rowFor("mine", "d1")]);

    await handler.handle(request(["mine", "unplaceable"]));

    expect(runner.stop).toHaveBeenCalledWith(["mine"]);
  });

  it("cancels nothing when the record cannot answer what the handles stand for", async () => {
    runs.findByHandles.mockRejectedValue(new Error("store is down"));

    await expect(handler.handle(request(["mine", "theirs"]))).rejects.toThrow("store is down");

    expect(runner.stop).not.toHaveBeenCalled();
  });

  it("keeps two collections apart when they hold the same document id", async () => {
    runs.findByHandles.mockResolvedValue([
      rowFor("in-posts", "shared"),
      { ...rowFor("in-pages", "shared"), collectionSlug: "pages" as CollectionSlug },
    ]);
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      ({ collection }: { collection: string }) =>
        Promise.resolve(collection === "pages" ? new Set(["shared"]) : new Set<string>())
    );

    await handler.handle(request(["in-posts", "in-pages"]));

    expect(runner.stop).toHaveBeenCalledWith(["in-posts"]);
  });
});
