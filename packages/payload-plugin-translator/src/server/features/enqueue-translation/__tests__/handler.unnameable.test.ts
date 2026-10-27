import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Payload, PayloadRequest } from "payload";

import type { TaskRunner, TaskRunnerFactory } from "../../../modules/task-runner/index.js";
import { storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

vi.mock("../../_lib/collection-utils.js", () => ({
  isCollectionAvailable: vi.fn((slug: string, available: Set<string>) =>
    available.has(slug) ? slug : null
  ),
}));

vi.mock("../../../shared/access/authorised.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../shared/access/authorised.js")>()),
  authorisedWork: vi.fn(async ({ tasks }: { tasks: unknown[] }) => ({
    authorised: tasks,
    refused: [],
  })),
}));

const { EnqueueTranslationHandler } = await import("../handler.js");

/** Two auth collections and a user with no `collection`: the pair the plugin cannot place. */
const TWO_AUTH_COLLECTIONS = [
  { slug: "admins", auth: {} },
  { slug: "editors", auth: {} },
];

describe("POST /enqueue and an actor the project cannot name", () => {
  let runner: TaskRunner;
  let factory: TaskRunnerFactory;
  let handler: InstanceType<typeof EnqueueTranslationHandler>;
  const warn = vi.fn();

  const request = (user: unknown): PayloadRequest =>
    ({
      payload: {
        config: { localization: { locales: ["en", "de"] }, collections: TWO_AUTH_COLLECTIONS },
        logger: { warn },
      } as unknown as Payload,
      user,
      json: vi.fn().mockResolvedValue({
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "posts",
        collection_id: ["d1"],
      }),
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    runner = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      run: vi.fn(),
    } as unknown as TaskRunner;
    factory = { create: vi.fn().mockReturnValue(runner), capabilities: { stop: true, run: true } };
    handler = new EnqueueTranslationHandler(
      { availableCollections: new Set(["posts"] as CollectionSlug[]) },
      factory,
      () => storeDouble()
    );
  });

  it("refuses, and queues nothing", async () => {
    const response = await handler.handle(request({ id: "anna" }));

    expect(response.status).toBe(403);
    expect(runner.enqueue).not.toHaveBeenCalled();
  });

  it("still queues for an actor it can name", async () => {
    const response = await handler.handle(request({ id: "anna", collection: "editors" }));

    expect(response.status).toBe(200);
    expect(runner.enqueue).toHaveBeenCalled();
  });

  it("still queues when the request carried no actor at all", async () => {
    const response = await handler.handle(request(null));

    expect(response.status).toBe(200);
    expect(runner.enqueue).toHaveBeenCalled();
  });
});
