import { asHash } from "../../../../core/domain/provenance/__tests__/fixtures/claims.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload } from "payload";
import type { ProvenanceReceipt } from "../../../../core/domain/provenance/index.js";
import { PayloadProvenanceStore } from "../Provenance.store.js";

const SLUG = "translator-provenance";

const HASHES = { title: asHash("3a7f1c"), body: asHash("91ce04") };
const SERIALIZED = JSON.stringify(HASHES);
const ACCEPTED_HASHES = { title: asHash("beef"), body: asHash("cafe") };
const SHA256_HEX_LENGTH = 64;
const LEGACY = "a".repeat(SHA256_HEX_LENGTH);

const record: ProvenanceReceipt = {
  collectionSlug: "posts",
  documentId: "doc-1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: HASHES,
  translatedAt: "2026-07-02T00:00:00.000Z",
};

const row = {
  ...record,
  sourceFingerprint: SERIALIZED,
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
        expect.objectContaining({
          collection: SLUG,
          data: expect.objectContaining({ ...record, sourceFingerprint: SERIALIZED }),
        })
      );
      expect(payload.update).not.toHaveBeenCalled();
    });

    it("updates the existing record in place, never duplicating", async () => {
      setFound([{ id: 7, ...row }]);
      await store.upsert({ ...record, sourceFingerprint: ACCEPTED_HASHES });
      expect(payload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: SLUG,
          id: 7,
          data: expect.objectContaining({
            sourceFingerprint: JSON.stringify(ACCEPTED_HASHES),
          }),
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

    it("falls back to update when a concurrent writer wins the create race", async () => {
      const findMock = payload.find as ReturnType<typeof vi.fn>;
      findMock.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({
        docs: [{ id: 9, ...row }],
      });
      (payload.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("unique constraint violation")
      );

      await expect(store.upsert(record)).resolves.toBeUndefined();

      expect(payload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: SLUG,
          id: 9,
          data: expect.objectContaining({ ...record, sourceFingerprint: SERIALIZED }),
        })
      );
    });

    it("rethrows the original create error when the race-fallback re-find also finds nothing", async () => {
      setFound([]);
      const createError = new Error("unique constraint violation");
      (payload.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(createError);

      await expect(store.upsert(record)).rejects.toBe(createError);

      expect(payload.update).not.toHaveBeenCalled();
    });
  });

  describe("find", () => {
    it("returns the record for the key", async () => {
      setFound([{ id: 7, ...row }]);
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

    it("normalizes a Date translatedAt to an ISO-8601 string", async () => {
      // Payload's `date` field may hand back a Date; #50's fingerprint comparison needs a stable ISO
      // string, so toRecord must convert it.
      setFound([{ id: 7, ...row, translatedAt: new Date("2026-07-02T00:00:00.000Z") }]);
      const result = await store.find({
        collectionSlug: "posts",
        documentId: "doc-1",
        targetLocale: "de",
      });
      expect(result?.translatedAt).toBe("2026-07-02T00:00:00.000Z");
    });

    it.each([
      ["a receipt written before per-field fingerprints", LEGACY],
      ["a value it cannot make sense of", "not a fingerprint"],
    ])("reads %s as a receipt claiming nothing, without throwing", async (_label, stored) => {
      setFound([{ id: 7, ...row, sourceFingerprint: stored }]);
      const result = await store.find({
        collectionSlug: "posts",
        documentId: "doc-1",
        targetLocale: "de",
      });
      expect(result?.translatedAt, "the row is still read").toBe("2026-07-02T00:00:00.000Z");
      expect(result?.sourceFingerprint).toBeNull();
    });
  });

  describe("rebaseSourceFingerprint", () => {
    const key = { collectionSlug: "posts", documentId: "doc-1", targetLocale: "de" };
    const accepted = ACCEPTED_HASHES;

    it("writes the fingerprint and nothing else", async () => {
      setFound([{ id: 7, ...row }]);
      await store.rebaseSourceFingerprint(key, accepted);
      expect(
        payload.update,
        "a run finishing mid-dismissal keeps its own translatedAt and its own claims"
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: SLUG,
          id: 7,
          data: { sourceFingerprint: JSON.stringify(ACCEPTED_HASHES) },
        })
      );
    });

    it("matches the record by the composite key", async () => {
      setFound([{ id: 7, ...row }]);
      await store.rebaseSourceFingerprint(key, accepted);
      expect(payload.find).toHaveBeenCalledWith(
        expect.objectContaining({
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

    it("creates nothing when no record exists for the key", async () => {
      setFound([]);
      await store.rebaseSourceFingerprint(key, accepted);
      expect(payload.update).not.toHaveBeenCalled();
      expect(
        payload.create,
        "a dismissal must not resurrect a deleted document's receipt"
      ).not.toHaveBeenCalled();
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

    it("does not thread `req`, so cleanup runs in its own transaction (best-effort contract)", async () => {
      // The delete-cleanup guarantee (never roll back the user's delete) relies on this: joining the
      // primary delete's transaction would let a failed sidecar delete poison it. Lock it in.
      await store.deleteByDocument("posts", "doc-1");
      expect(payload.delete).not.toHaveBeenCalledWith(
        expect.objectContaining({ req: expect.anything() })
      );
    });
  });

  describe("findByDocument", () => {
    it("queries every locale for the document (no targetLocale in the where)", async () => {
      setFound([]);
      await store.findByDocument("posts", "doc-1");
      expect(payload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: SLUG,
          where: {
            and: [{ collectionSlug: { equals: "posts" } }, { documentId: { equals: "doc-1" } }],
          },
          pagination: false,
        })
      );
    });

    it("maps every found doc through toRecord", async () => {
      setFound([
        { id: 1, ...row },
        {
          id: 2,
          ...row,
          targetLocale: "fr",
          translatedAt: new Date("2026-07-02T00:00:00.000Z"),
        },
      ]);
      const result = await store.findByDocument("posts", "doc-1");
      expect(result).toEqual([
        record,
        {
          ...record,
          targetLocale: "fr",
          translatedAt: "2026-07-02T00:00:00.000Z",
        },
      ]);
    });

    it("returns an empty array when the document has no records", async () => {
      setFound([]);
      expect(await store.findByDocument("posts", "missing")).toEqual([]);
    });
  });
});
