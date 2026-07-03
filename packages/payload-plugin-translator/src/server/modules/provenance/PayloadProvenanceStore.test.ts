import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload } from "payload";
import type { TranslationProvenanceRecord } from "../../../core/provenance";
import { PayloadProvenanceStore } from "./PayloadProvenanceStore";

const SLUG = "translator-provenance";

const record: TranslationProvenanceRecord = {
  collectionSlug: "posts",
  documentId: "doc-1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: "fp-abc",
  translatedAt: "2026-07-02T00:00:00.000Z",
  dismissedFingerprint: null,
};

describe("PayloadProvenanceStore", () => {
  let payload: Payload;
  let store: PayloadProvenanceStore;

  const setFound = (docs: unknown[]) => {
    (payload.find as ReturnType<typeof vi.fn>).mockResolvedValue({ docs });
  };

  beforeEach(() => {
    payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    } as unknown as Payload;
    store = new PayloadProvenanceStore(payload, SLUG);
  });

  describe("upsert", () => {
    it("creates a new record when none exists for the key", async () => {
      setFound([]);
      await store.upsert(record);
      expect(payload.create).toHaveBeenCalledWith(
        expect.objectContaining({ collection: SLUG, data: expect.objectContaining(record) })
      );
      expect(payload.update).not.toHaveBeenCalled();
    });

    it("updates the existing record in place, never duplicating", async () => {
      setFound([{ id: 7, ...record }]);
      await store.upsert({ ...record, sourceFingerprint: "fp-new" });
      expect(payload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: SLUG,
          id: 7,
          data: expect.objectContaining({ sourceFingerprint: "fp-new" }),
        })
      );
      expect(payload.create).not.toHaveBeenCalled();
    });

    it("matches the existing record by the composite key", async () => {
      setFound([]);
      await store.upsert(record);
      expect(payload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: SLUG,
          where: {
            and: [
              { collectionSlug: { equals: "posts" } },
              { documentId: { equals: "doc-1" } },
              { targetLocale: { equals: "de" } },
            ],
          },
        })
      );
    });
  });

  describe("find", () => {
    it("returns the record for the key", async () => {
      setFound([{ id: 7, ...record }]);
      const result = await store.find({
        collectionSlug: "posts",
        documentId: "doc-1",
        targetLocale: "de",
      });
      expect(result).toEqual(record);
    });

    it("returns null when no record exists", async () => {
      setFound([]);
      const result = await store.find({
        collectionSlug: "posts",
        documentId: "missing",
        targetLocale: "de",
      });
      expect(result).toBeNull();
    });
  });

  describe("deleteByDocument", () => {
    it("deletes every record for the document", async () => {
      await store.deleteByDocument("posts", "doc-1");
      expect(payload.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: SLUG,
          where: {
            and: [{ collectionSlug: { equals: "posts" } }, { documentId: { equals: "doc-1" } }],
          },
        })
      );
    });
  });
});
