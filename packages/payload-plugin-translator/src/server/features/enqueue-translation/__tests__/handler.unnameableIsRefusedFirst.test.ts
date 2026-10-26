import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";

/*
 * `handler.unnameable.test.ts` mocks `authorisedWork` away, so it cannot see *when* the refusal
 * happens. This one leaves the ask in place and watches it: Payload fills a missing `user.collection`
 * with the admin one (`createLocalReq`, 3.90.1), so an ask that runs first evaluates the host's rule
 * as whoever shares that id in the admin collection.
 */

vi.mock("../../_lib/collection-utils.js", () => ({
  isCollectionAvailable: vi.fn((slug: string, available: Set<string>) =>
    available.has(slug) ? slug : null
  ),
}));

const askedAbout: unknown[] = [];
vi.mock("../../../shared/access/permission.js", () => ({
  mayInitiate: vi.fn(async (query: { user: unknown }) => {
    askedAbout.push(query.user);
    return true;
  }),
}));

const { EnqueueTranslationHandler } = await import("../handler.js");

const twoAuthCollections = [
  { slug: "admins", auth: true },
  { slug: "editors", auth: true },
];

const request = (user: unknown, body: Record<string, unknown> = {}): PayloadRequest =>
  ({
    payload: {
      config: { localization: { locales: ["en", "de"] }, collections: twoAuthCollections },
      logger: { warn: vi.fn() },
    } as unknown as Payload,
    user,
    json: vi.fn().mockResolvedValue({
      source_lng: "en",
      target_lng: ["de"],
      collection_slug: "posts",
      collection_id: ["d1"],
      ...body,
    }),
  }) as unknown as PayloadRequest;

describe("POST /enqueue refuses an unnameable actor before asking about anything", () => {
  let handler: InstanceType<typeof EnqueueTranslationHandler>;

  beforeEach(() => {
    askedAbout.length = 0;
    handler = new EnqueueTranslationHandler(
      { availableCollections: new Set(["posts"] as CollectionSlug[]) },
      { create: vi.fn().mockReturnValue({ enqueue: vi.fn().mockResolvedValue(undefined) }) }
    );
  });

  it("asks the host's rule about nobody when the actor cannot be placed", async () => {
    const response = await handler.handle(request({ id: "anna" }));

    expect(response.status).toBe(403);
    expect(askedAbout).toEqual([]);
  });

  it("asks about a named actor as usual", async () => {
    const response = await handler.handle(request({ id: "anna", collection: "editors" }));

    expect(response.status).toBe(200);
    expect(askedAbout).toHaveLength(1);
  });

  it("reads the whole collection only after the actor has been placed", async () => {
    const response = await handler.handle(request({ id: "anna" }, { select_all: true }));

    expect(response.status).toBe(403);
  });
});
