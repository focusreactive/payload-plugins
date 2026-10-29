import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest, CollectionSlug } from "payload";

import { GetDocumentStatusHandler } from "../handler.js";
import type { GetDocumentStatusConfig } from "../model.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";

const everyDocumentIsVisible = () =>
  vi.fn(async (args: { where?: { id?: { in?: string[] } } }) => ({
    docs: (args.where?.id?.in ?? []).map((id) => ({ id })),
  }));

describe("GetDocumentStatusHandler", () => {
  let handler: GetDocumentStatusHandler;
  let runs: RunRecordStoreDouble;
  let openTheRecord: ReturnType<typeof vi.fn>;
  let config: GetDocumentStatusConfig;

  const request = (params: Record<string, string> = {}): PayloadRequest =>
    ({
      payload: { find: everyDocumentIsVisible() } as unknown as Payload,
      routeParams: params,
    }) as unknown as PayloadRequest;

  const aboutDoc123 = () => request({ collection_slug: "posts", collection_id: "doc-123" });

  const answered = async (req: PayloadRequest) => {
    const response = await handler.handle(req);
    return { status: response.status, body: await response.json() };
  };

  beforeEach(() => {
    vi.unstubAllEnvs();
    runs = storeDouble();
    openTheRecord = vi.fn(() => runs);
    config = { availableCollections: new Set(["posts", "pages"] as CollectionSlug[]) };
    handler = new GetDocumentStatusHandler(config, openTheRecord);
  });

  describe("validation", () => {
    it("refuses a request with no collection", async () => {
      expect((await answered(request({ collection_id: "doc-123" }))).status).toBe(400);
    });

    it("refuses a request with no document", async () => {
      expect((await answered(request({ collection_slug: "posts" }))).status).toBe(400);
    });

    it("refuses a collection the plugin does not translate", async () => {
      const { status, body } = await answered(
        request({ collection_slug: "users", collection_id: "doc-123" })
      );

      expect(status).toBe(400);
      expect(body.message).toBe("Collection not available for translation");
    });
  });

  describe("what it reads", () => {
    it("asks the run record about that one document, and the runner about nothing", async () => {
      await answered(request({ collection_slug: "posts", collection_id: "doc-456" }));

      expect(runs.findByDocument).toHaveBeenCalledWith({
        collectionSlug: "posts",
        collectionId: "doc-456",
      });
    });

    it("opens the record on the request's own payload", async () => {
      const req = aboutDoc123();

      await answered(req);

      expect(openTheRecord).toHaveBeenCalledWith(req.payload);
    });

    it("answers with nothing when the document has never been translated", async () => {
      const { status, body } = await answered(aboutDoc123());

      expect(status).toBe(200);
      expect(body.data).toEqual([]);
    });
  });

  describe("what it answers", () => {
    it("names the run, the document and the locale", async () => {
      runs.findByDocument.mockResolvedValue([
        runRow({
          handle: "job-7",
          settledAt: "2026-10-27T10:05:00.000Z",
          startedAt: "2026-10-27T10:01:00.000Z",
          outcome: "delivered",
        }),
      ]);

      const { body } = await answered(aboutDoc123());

      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        id: "job-7",
        status: "completed",
        completed_at: "2026-10-27T10:05:00.000Z",
        input: {
          collection: { relationTo: "posts", value: "doc-1" },
          source_lng: "en",
          target_lng: "de",
        },
      });
    });

    it("says pending for a locale nothing has started, and running once it has", async () => {
      runs.findByDocument.mockResolvedValue([
        runRow({ targetLng: "fr" }),
        runRow({ targetLng: "es", startedAt: "2026-10-27T10:01:00.000Z" }),
      ]);

      const { body } = await answered(aboutDoc123());

      const byLocale = Object.fromEntries(
        (body.data as Array<{ status: string; input: { target_lng: string } }>).map((entry) => [
          entry.input.target_lng,
          entry.status,
        ])
      );
      expect(byLocale).toEqual({ fr: "pending", es: "running" });
    });

    it("keeps one entry per target locale, the newest run for each", async () => {
      runs.findByDocument.mockResolvedValue([
        runRow({
          handle: "de-old",
          queuedAt: "2026-10-01T00:00:00.000Z",
          outcome: "failed",
          settledAt: "2026-10-01T00:01:00.000Z",
        }),
        runRow({
          handle: "de-new",
          queuedAt: "2026-10-02T00:00:00.000Z",
          startedAt: "2026-10-02T00:01:00.000Z",
        }),
        runRow({ handle: "fr-1", targetLng: "fr", queuedAt: "2026-10-01T12:00:00.000Z" }),
      ]);

      const { body } = await answered(aboutDoc123());

      const byLocale = Object.fromEntries(
        (body.data as Array<{ id: string; status: string; input: { target_lng: string } }>).map(
          (entry) => [entry.input.target_lng, entry]
        )
      );
      expect(Object.keys(byLocale).sort()).toEqual(["de", "fr"]);
      expect(byLocale.de).toMatchObject({ id: "de-new", status: "running" });
      expect(byLocale.fr).toMatchObject({ id: "fr-1", status: "pending" });
    });

    it("says nothing about a locale whose only run was cancelled", async () => {
      runs.findByDocument.mockResolvedValue([
        runRow({ targetLng: "de", outcome: "cancelled", settledAt: "2026-10-27T10:02:00.000Z" }),
        runRow({ targetLng: "fr" }),
      ]);

      const { body } = await answered(aboutDoc123());

      expect(
        (body.data as Array<{ input: { target_lng: string } }>).map((e) => e.input.target_lng)
      ).toEqual(["fr"]);
    });

    it("falls back to what a locale last did when its newest run was cancelled", async () => {
      runs.findByDocument.mockResolvedValue([
        runRow({
          handle: "delivered-first",
          queuedAt: "2026-10-01T00:00:00.000Z",
          startedAt: "2026-10-01T00:01:00.000Z",
          settledAt: "2026-10-01T00:02:00.000Z",
          outcome: "delivered",
        }),
        runRow({
          handle: "cancelled-later",
          queuedAt: "2026-10-02T00:00:00.000Z",
          settledAt: "2026-10-02T00:01:00.000Z",
          outcome: "cancelled",
        }),
      ]);

      const { body } = await answered(aboutDoc123());

      expect(body.data[0]).toMatchObject({ id: "delivered-first", status: "completed" });
    });

    it("hands the stored failure text on as it was stored, with no second cleaning", async () => {
      vi.stubEnv("NODE_ENV", "production");
      runs.findByDocument.mockResolvedValue([
        runRow({
          outcome: "failed",
          settledAt: "2026-10-27T10:05:00.000Z",
          error: "The configured translation model is not available to this API key.",
        }),
      ]);

      const { body } = await answered(aboutDoc123());

      expect(body.data[0].status).toBe("failed");
      expect(body.data[0].error).toEqual({
        message: "The configured translation model is not available to this API key.",
      });
    });

    it("hides a document the caller may not read", async () => {
      runs.findByDocument.mockResolvedValue([runRow()]);
      const req = request({ collection_slug: "posts", collection_id: "doc-123" });
      (req.payload as unknown as { find: unknown }).find = vi.fn(async () => ({ docs: [] }));

      const { body } = await answered(req);

      expect(body.data).toEqual([]);
    });
  });
});
