import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";

import { GetCollectionStatusHandler } from "../handler.js";
import type { GetCollectionStatusConfig } from "../model.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

const THREE_DAYS = 259_200_000;

const everyDocumentIsVisible = () =>
  vi.fn(async (args: { where?: { id?: { in?: string[] } } }) => ({
    docs: (args.where?.id?.in ?? []).map((id) => ({ id })),
  }));

describe("GetCollectionStatusHandler", () => {
  let handler: GetCollectionStatusHandler;
  let runs: RunRecordStoreDouble;
  let openTheRecord: ReturnType<typeof vi.fn>;
  let config: GetCollectionStatusConfig;

  const request = (params: Record<string, string> = {}): PayloadRequest =>
    ({
      payload: { find: everyDocumentIsVisible() } as unknown as Payload,
      routeParams: params,
    }) as unknown as PayloadRequest;

  const answered = async (req: PayloadRequest) => {
    const response = await handler.handle(req);
    return { status: response.status, body: await response.json() };
  };

  beforeEach(() => {
    runs = storeDouble();
    openTheRecord = vi.fn(() => runs);
    config = {
      availableCollections: new Set(["posts", "pages"] as CollectionSlug[]),
      failedWindowMs: THREE_DAYS,
    };
    handler = new GetCollectionStatusHandler(config, openTheRecord);
  });

  describe("validation", () => {
    it("refuses a request naming no collection", async () => {
      const { status, body } = await answered(request({}));

      expect(status).toBe(400);
      expect(body.message).toBe("Validation error");
    });

    it("refuses a collection the plugin does not translate", async () => {
      const { status, body } = await answered(request({ collection_slug: "users" }));

      expect(status).toBe(400);
      expect(body.message).toBe("Collection not available for translation");
    });
  });

  describe("what it reads", () => {
    it("asks for the work in flight and, separately, the failures inside the window", async () => {
      const before = Date.now();

      await answered(request({ collection_slug: "pages" }));

      expect(runs.findLiveInCollection).toHaveBeenCalledWith("pages");
      const [slug, since] = runs.findRecentlyFailedInCollection.mock.calls[0];
      expect(slug).toBe("pages");
      expect(
        (since as Date).getTime(),
        "the window reaches back exactly as far as the setting says"
      ).toBeGreaterThanOrEqual(before - THREE_DAYS - 1000);
      expect((since as Date).getTime()).toBeLessThanOrEqual(Date.now() - THREE_DAYS + 1000);
    });

    it("asks which documents are visible once, not once per row", async () => {
      const find = everyDocumentIsVisible();
      const req = request({ collection_slug: "posts" });
      (req as unknown as { payload: unknown }).payload = { find };
      runs.findLiveInCollection.mockResolvedValue([
        runRow({ handle: "r1" }),
        runRow({ handle: "r2" }),
        runRow({ handle: "r3" }),
      ]);

      await handler.handle(req);

      expect(
        find,
        "Payload folds a read rule into the query, so three rows cost one question, not three"
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("what it answers", () => {
    it("answers with nothing when the collection has nothing to report", async () => {
      const { status, body } = await answered(request({ collection_slug: "posts" }));

      expect(status).toBe(200);
      expect(body.data).toEqual({ docs: [], failed_window_ms: THREE_DAYS });
    });

    it("names the run, the document and the locale, one entry per locale", async () => {
      runs.findLiveInCollection.mockResolvedValue([
        runRow({ handle: "run-1", targetLng: "de", startedAt: "2026-10-27T10:01:00.000Z" }),
        runRow({ handle: "run-1", targetLng: "fr" }),
        runRow({ handle: "run-2", collectionId: "doc-9", targetLng: "de" }),
      ]);

      const { body } = await answered(request({ collection_slug: "posts" }));

      expect(
        body.data.docs,
        "two of these share a run, so the handle alone cannot tell them apart"
      ).toEqual([
        { id: "run-1", status: "running", collection_id: "doc-1", target_lng: "de" },
        { id: "run-1", status: "pending", collection_id: "doc-1", target_lng: "fr" },
        { id: "run-2", status: "pending", collection_id: "doc-9", target_lng: "de" },
      ]);
    });

    it("lists a recent failure beside the work in flight", async () => {
      runs.findLiveInCollection.mockResolvedValue([runRow({ handle: "live" })]);
      runs.findRecentlyFailedInCollection.mockResolvedValue([
        runRow({
          handle: "broke",
          targetLng: "fr",
          startedAt: "2026-10-27T10:01:00.000Z",
          settledAt: "2026-10-27T10:02:00.000Z",
          outcome: "failed",
          error: "it broke",
        }),
      ]);

      const { body } = await answered(request({ collection_slug: "posts" }));

      expect(body.data.docs.map((d: { status: string }) => d.status)).toEqual([
        "pending",
        "failed",
      ]);
    });

    it("hides a document the caller may not read", async () => {
      const req = request({ collection_slug: "posts" });
      (req.payload as unknown as { find: unknown }).find = vi.fn(async () => ({ docs: [] }));
      runs.findLiveInCollection.mockResolvedValue([runRow()]);

      const { body } = await answered(req);

      expect(body.data.docs).toEqual([]);
    });
  });
});
