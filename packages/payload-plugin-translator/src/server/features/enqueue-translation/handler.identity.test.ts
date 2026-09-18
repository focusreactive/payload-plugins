import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, PayloadRequest } from "payload";

import { EnqueueTranslationHandler } from "./handler";

const LOCALIZATION = { defaultLocale: "en", locales: ["en", "de"] };

const body = {
  source_lng: "en",
  target_lng: ["de"],
  collection_slug: "posts",
  collection_id: ["doc-1"],
  strategy: "overwrite",
  publish_on_translation: false,
};

function setup(user: unknown) {
  const enqueue = vi.fn().mockResolvedValue(undefined);
  const handler = new EnqueueTranslationHandler(
    { availableCollections: new Set(["posts" as CollectionSlug]) } as never,
    { create: vi.fn().mockReturnValue({ enqueue }) } as never
  );

  const req = {
    json: () => Promise.resolve(body),
    user,
    payload: {
      config: { localization: LOCALIZATION },
      logger: { warn: vi.fn(), error: vi.fn() },
    },
  } as unknown as PayloadRequest;

  return { handler, enqueue, req };
}

// The manual Translate button is the path an editor actually presses. Queueing without recording who
// pressed it would leave every manual translation unattributed — and unattributed means the write is
// made with access control off.
describe("POST /enqueue — who the queued translation is attributed to", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records the caller who pressed Translate", async () => {
    const { handler, enqueue, req } = setup({ id: "anna", collection: "users" });

    await handler.handle(req);

    const [, scope] = enqueue.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(scope).toMatchObject({ userId: "anna", userCollection: "users" });
  });

  it("records nobody when the request carried no session", async () => {
    const { handler, enqueue, req } = setup(null);

    await handler.handle(req);

    const [, scope] = enqueue.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(scope.userId).toBeNull();
  });
});
