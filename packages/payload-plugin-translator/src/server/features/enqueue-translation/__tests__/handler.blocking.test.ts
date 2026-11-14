import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, PayloadRequest } from "payload";

import { EnqueueTranslationHandler } from "../handler.js";
import type { EnqueueConfig } from "../model.js";
import type { TaskRunner, TaskRunnerFactory } from "../../../modules/task-runner/index.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { refusedTargets } = await import("../../../shared/access/refusedTargets.js");
const refuse = refusedTargets as unknown as ReturnType<typeof vi.fn>;

const everyDocumentIsVisible = () =>
  vi.fn(async (args: { where?: { id?: { in?: string[] } } }) => ({
    docs: (args.where?.id?.in ?? []).map((id) => ({ id })),
  }));

describe("one run per document, decided before the runner is asked", () => {
  let handler: EnqueueTranslationHandler;
  let runner: TaskRunner;
  let runs: RunRecordStoreDouble;
  let config: EnqueueConfig;

  const request = (body: Record<string, unknown>): PayloadRequest =>
    ({
      payload: {
        config: { localization: { locales: ["en", "de", "fr"] } },
        logger: { warn: vi.fn() },
        find: everyDocumentIsVisible(),
      },
      user: { id: "anna", collection: "users" },
      json: vi.fn().mockResolvedValue(body),
    }) as unknown as PayloadRequest;

  const ask = (ids: string[], over: Record<string, unknown> = {}) =>
    request({
      source_lng: "en",
      target_lng: ["de"],
      collection_slug: "posts",
      collection_id: ids,
      ...over,
    });

  const answered = async (req: PayloadRequest) => (await handler.handle(req)).json();
  const queuedWork = () => (runner.enqueue as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];

  beforeEach(() => {
    vi.clearAllMocks();
    refuse.mockResolvedValue(new Set<string>());
    runner = {
      enqueue: vi.fn().mockResolvedValue([]),
      cancel: vi.fn(),
      run: vi.fn(),
    } as unknown as TaskRunner;
    runs = storeDouble();
    config = { availableCollections: new Set(["posts"] as CollectionSlug[]) };
    handler = new EnqueueTranslationHandler(
      config,
      { create: vi.fn().mockReturnValue(runner) } as unknown as TaskRunnerFactory,
      () => runs
    );
  });

  it("queues nothing for a document that already has a run under way", async () => {
    runs.findLiveForDocuments.mockResolvedValue([runRow({ collectionId: "d1" })]);

    const body = await answered(ask(["d1"]));

    expect(queuedWork()).toEqual([]);
    expect(body.data.queued).toBe(0);
    expect(body.data.busy).toEqual(["d1"]);
  });

  it("queues the free document alongside, and names only the busy one", async () => {
    runs.findLiveForDocuments.mockResolvedValue([runRow({ collectionId: "busy" })]);

    const body = await answered(ask(["busy", "free"]));

    expect(queuedWork().map((task: { collectionId: string }) => task.collectionId)).toEqual([
      "free",
    ]);
    expect(body.data.busy).toEqual(["busy"]);
    expect(body.data.queued).toBe(1);
  });

  it("keeps being busy apart from being refused, because they mean opposite things", async () => {
    refuse.mockResolvedValue(new Set(["forbidden"]));
    runs.findLiveForDocuments.mockResolvedValue([runRow({ collectionId: "busy" })]);

    const body = await answered(ask(["forbidden", "busy", "free"]));

    expect(body.data.refused).toEqual(["forbidden"]);
    expect(body.data.busy).toEqual(["busy"]);
  });

  it("says nothing about busy documents when there are none", async () => {
    const body = await answered(ask(["free"]));

    expect(body.data).not.toHaveProperty("busy");
  });

  it("asks the record only about the documents the caller may change", async () => {
    refuse.mockResolvedValue(new Set(["forbidden"]));

    await answered(ask(["forbidden", "free"]));

    expect(
      runs.findLiveForDocuments,
      "a document the caller may not touch is theirs to be refused about, not told is busy"
    ).toHaveBeenCalledWith("posts", ["free"]);
  });

  it("asks the record about the whole collection when the request is select_all", async () => {
    await answered(ask([], { select_all: true, collection_id: ["ignored"] }));

    expect(runs.findLiveInCollection).toHaveBeenCalledWith("posts");
    expect(runs.findLiveForDocuments).not.toHaveBeenCalled();
  });

  it("frees a document whose runs have all settled", async () => {
    runs.findLiveForDocuments.mockResolvedValue([]);

    const body = await answered(ask(["d1"]));

    expect(body.data.queued).toBe(1);
    expect(body.data).not.toHaveProperty("busy");
  });
});
