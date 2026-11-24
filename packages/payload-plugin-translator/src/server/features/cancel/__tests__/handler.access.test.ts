import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Payload, PayloadRequest } from "payload";

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
const AVAILABLE = { availableCollections: new Set<CollectionSlug>(["posts" as CollectionSlug]) };

const refuse = (documentIds: string[]) =>
  (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(documentIds));

const rowFor = (handle: string, collectionId: string): RunRecord =>
  runRow({
    handle,
    collectionSlug: "posts" as CollectionSlug,
    collectionId,
    requesterId: "anna",
    requesterCollection: "users",
  });

describe("DELETE /cancel asks about every document behind the runs it would stop", () => {
  let runner: TaskRunner;
  let runs: RunRecordStoreDouble;
  let handler: InstanceType<typeof CancelHandler>;

  const request = (body: Record<string, unknown>): PayloadRequest =>
    ({
      payload: {} as Payload,
      user: ANNA,
      json: vi.fn().mockResolvedValue({ collection_slug: "posts", ...body }),
    }) as unknown as PayloadRequest;

  const named = (collection_id: string[]) => request({ collection_id });
  const wholeCollection = () => request({ select_all: true });

  beforeEach(() => {
    vi.clearAllMocks();
    refuse([]);
    runner = {
      enqueue: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
    } as unknown as TaskRunner;
    runs = storeDouble({
      findLiveForDocuments: vi
        .fn()
        .mockResolvedValue([rowFor("mine", "d1"), rowFor("theirs", "d2")]),
      findLiveInCollection: vi
        .fn()
        .mockResolvedValue([rowFor("mine", "d1"), rowFor("theirs", "d2")]),
    });
    handler = new CancelHandler(
      AVAILABLE,
      {
        create: vi.fn().mockReturnValue(runner),
        capabilities: { stop: true, run: true },
        report: vi.fn(),
      },
      () => runs
    );
  });

  it("stops only the runs whose document the caller may change", async () => {
    refuse(["d2"]);

    await handler.handle(named(["d1", "d2"]));

    expect(runner.stop).toHaveBeenCalledWith(["mine"]);
  });

  it("asks per document on the whole-collection path too — the run record carries no rule about the documents behind it", async () => {
    refuse(["d2"]);

    await handler.handle(wholeCollection());

    expect(runner.stop).toHaveBeenCalledWith(["mine"]);
  });

  it("names the refused runs", async () => {
    refuse(["d2"]);

    const body = await (await handler.handle(named(["d1", "d2"]))).json();

    expect(body, "the caller is told which document was refused, not which run").toMatchObject({
      data: { refused: ["d2"] },
    });
  });

  it("names the refused runs on the whole-collection path as well, rather than answering in silence", async () => {
    refuse(["d2"]);

    const response = await handler.handle(wholeCollection());

    expect(response.status).toBe(200);
    expect(
      await response.json(),
      "a run the caller never named must not come back named"
    ).toMatchObject({ data: { refused: ["d2"] } });
  });

  it("answers 204 with no body when nothing was refused", async () => {
    const response = await handler.handle(named(["d1", "d2"]));

    expect(response.status).toBe(204);
    expect(runner.stop).toHaveBeenCalledWith(["mine", "theirs"]);
  });

  it("stops nothing when the record cannot answer what is live", async () => {
    runs.findLiveForDocuments.mockRejectedValue(new Error("store is down"));

    await expect(handler.handle(named(["d1"]))).rejects.toThrow("store is down");

    expect(runner.stop).not.toHaveBeenCalled();
  });

  it("keeps two collections apart when they hold the same document id", async () => {
    runs.findLiveForDocuments.mockResolvedValue([
      rowFor("in-posts", "shared"),
      { ...rowFor("in-pages", "shared"), collectionSlug: "pages" as CollectionSlug },
    ]);
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      ({ collection }: { collection: string }) =>
        Promise.resolve(collection === "pages" ? new Set(["shared"]) : new Set<string>())
    );

    await handler.handle(named(["shared"]));

    expect(runner.stop).toHaveBeenCalledWith(["in-posts"]);
  });
});
