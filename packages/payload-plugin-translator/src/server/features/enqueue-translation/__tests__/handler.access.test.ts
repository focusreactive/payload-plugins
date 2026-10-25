import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";

import type { TaskRunnerFactory, TaskRunner } from "../../../modules/task-runner/index.js";

vi.mock("../../_lib/collection-utils.js", () => ({
  isCollectionAvailable: vi.fn((slug: string, available: Set<string>) =>
    available.has(slug) ? slug : null
  ),
}));

vi.mock("../../../shared/payload/collections.js", () => ({
  getAllCollectionIds: vi.fn().mockResolvedValue(["mine"]),
}));

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { EnqueueTranslationHandler } = await import("../handler.js");
const { refusedTargets } = await import("../../../shared/access/refusedTargets.js");

const refusing = (...ids: string[]) =>
  (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(ids));

const ANNA = { id: "anna", collection: "users" };

describe("enqueue asks about every document it was named", () => {
  let runner: TaskRunner;
  let factory: TaskRunnerFactory;
  let handler: InstanceType<typeof EnqueueTranslationHandler>;

  const request = (body: unknown): PayloadRequest =>
    ({
      payload: {
        config: { localization: { locales: ["en", "de"] } },
        logger: { warn: vi.fn() },
      } as unknown as Payload,
      user: ANNA,
      json: vi.fn().mockResolvedValue(body),
    }) as unknown as PayloadRequest;

  const twoDocuments = {
    source_lng: "en",
    target_lng: ["de"],
    collection_slug: "posts",
    collection_id: ["mine", "theirs"],
  };

  const queuedIds = () =>
    ((runner.enqueue as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? []).map(
      (task: { collectionId: string }) => task.collectionId
    );

  beforeEach(() => {
    vi.clearAllMocks();
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set<string>());
    runner = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      run: vi.fn(),
      findByCollection: vi.fn(),
    };
    factory = { create: vi.fn().mockReturnValue(runner) };
    handler = new EnqueueTranslationHandler(
      { availableCollections: new Set(["posts"] as CollectionSlug[]) },
      factory
    );
  });

  it("does not queue a document the update rule refuses", async () => {
    refusing("theirs");

    await handler.handle(request(twoDocuments));

    expect(queuedIds()).not.toContain("theirs");
  });

  it("still queues the documents in the same request that it allows", async () => {
    refusing("theirs");

    await handler.handle(request(twoDocuments));

    expect(queuedIds()).toEqual(["mine"]);
  });

  it("names the refused documents in the answer", async () => {
    refusing("theirs");

    const body = await (await handler.handle(request(twoDocuments))).json();

    expect(body).toMatchObject({ data: { refused: ["theirs"], queued: 1 } });
  });

  it("asks about the ids the caller named, for this collection and this user", async () => {
    await handler.handle(request(twoDocuments));

    expect(refusedTargets).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "posts", ids: ["mine", "theirs"], user: ANNA })
    );
  });

  it("asks nothing per document when the caller said select_all", async () => {
    await handler.handle(request({ ...twoDocuments, select_all: true }));

    expect(refusedTargets).not.toHaveBeenCalled();
  });

  it("says nothing about refusals when there were none", async () => {
    const body = await (await handler.handle(request(twoDocuments))).json();

    expect(body.data).not.toHaveProperty("refused");
  });
});
