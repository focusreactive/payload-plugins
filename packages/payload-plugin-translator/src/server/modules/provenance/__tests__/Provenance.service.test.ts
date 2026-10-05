import { TranslatorBug } from "../../../../core/errors/index.js";
import { describe, it, expect, vi } from "vitest";
import type { Field } from "payload";
import { APIError } from "payload";

import type {
  ProvenanceStore,
  ProvenanceReceipt,
} from "../../../../core/domain/provenance/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";

import { ProvenanceService } from "../Provenance.service.js";

const COLLECTION = "posts";
const schema: Field[] = [{ name: "title", type: "text", localized: true }];
const schemaMap = new Map([[COLLECTION, schema]]) as CollectionSchemaMap;
const sourceDoc = { id: "1", title: "Hello" };

function makeStore(overrides: Partial<ProvenanceStore> = {}): ProvenanceStore {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    find: vi.fn().mockResolvedValue(null),
    findByDocument: vi.fn().mockResolvedValue([]),
    dismiss: vi.fn().mockResolvedValue(undefined),
    deleteByDocument: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeIo(read: (args: { locale: string }) => Promise<Record<string, unknown> | null>) {
  return {
    logger: { error: vi.fn() },
    readSource: vi.fn(({ locale }: { locale: string }) => read({ locale })),
  };
}

const record = (over: Partial<ProvenanceReceipt> = {}): ProvenanceReceipt => ({
  collectionSlug: COLLECTION,
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: { kind: "fields", hashes: { title: "x" } },
  translatedAt: "2026-07-15T00:00:00.000Z",
  dismissedFingerprint: null,
  ...over,
});

describe("ProvenanceService", () => {
  it("captureFingerprint returns null for a collection with no schema", () => {
    const service = new ProvenanceService(
      makeStore(),
      schemaMap,
      {},
      makeIo(async () => sourceDoc)
    );
    expect(service.captureFingerprint("unknown", sourceDoc)).toBeNull();
  });

  it("write capture and read recompute hash identically — the one-owner invariant", async () => {
    const captureService = new ProvenanceService(
      makeStore(),
      schemaMap,
      {},
      makeIo(async () => sourceDoc)
    );
    const writeFingerprint = captureService.captureFingerprint(COLLECTION, sourceDoc);
    expect(writeFingerprint).toEqual(expect.objectContaining({ title: expect.any(String) }));

    const freshStore = makeStore({
      findByDocument: vi
        .fn()
        .mockResolvedValue([
          record({ sourceFingerprint: { kind: "fields", hashes: writeFingerprint! } }),
        ]),
    });
    const freshService = new ProvenanceService(
      freshStore,
      schemaMap,
      {},
      makeIo(async () => sourceDoc)
    );
    const fresh = await freshService.getStaleness(COLLECTION, "1");
    expect(fresh).toEqual([
      { target_lng: "de", source_lng: "en", is_stale: false, translated_at: record().translatedAt },
    ]);

    const driftStore = makeStore({
      findByDocument: vi
        .fn()
        .mockResolvedValue([
          record({ sourceFingerprint: { kind: "fields", hashes: writeFingerprint! } }),
        ]),
    });
    const driftService = new ProvenanceService(
      driftStore,
      schemaMap,
      {},
      makeIo(async () => ({ id: "1", title: "Changed" }))
    );
    const drifted = await driftService.getStaleness(COLLECTION, "1");
    expect(drifted[0].is_stale).toBe(true);
  });

  it("getStaleness drops a locale it cannot recompute and keeps going", async () => {
    const store = makeStore({
      findByDocument: vi
        .fn()
        .mockResolvedValue([
          record({ targetLocale: "de" }),
          record({ targetLocale: "fr", sourceLocale: "it" }),
        ]),
    });
    const io = makeIo(async ({ locale }) =>
      locale === "en" ? Promise.reject(new APIError("relation does not exist")) : sourceDoc
    );
    const service = new ProvenanceService(store, schemaMap, {}, io);

    const locales = await service.getStaleness(COLLECTION, "1");

    expect(
      locales.map((l) => l.target_lng),
      "no transaction carried this read, so one unreadable locale must not cost the others"
    ).toEqual(["fr"]);
    expect(io.logger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("getStaleness lets a foreign failure out when the caller is in a transaction", async () => {
    const fromPayload = new APIError("relation does not exist");
    const store = makeStore({ findByDocument: vi.fn().mockResolvedValue([record()]) });
    const io = makeIo(async () => {
      throw fromPayload;
    });
    const service = new ProvenanceService(store, schemaMap, { transactionID: "tx-1" }, io);

    await expect(
      service.getStaleness(COLLECTION, "1"),
      "the read ran inside the caller's transaction, which Payload has now rolled back"
    ).rejects.toBe(fromPayload);
  });

  it("getStaleness swallows one of ours even inside the caller's transaction", async () => {
    const store = makeStore({ findByDocument: vi.fn().mockResolvedValue([record()]) });
    const io = makeIo(async () => {
      throw new TranslatorBug("fingerprint blew up");
    });
    const service = new ProvenanceService(store, schemaMap, { transactionID: "tx-1" }, io);

    await expect(service.getStaleness(COLLECTION, "1")).resolves.toEqual([]);
  });

  it("record is best-effort — a store failure of ours is caught and logged, not thrown", async () => {
    const io = makeIo(async () => sourceDoc);
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new TranslatorBug("table down")) });
    const service = new ProvenanceService(store, schemaMap, {}, io);

    await expect(
      service.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        { title: "fp" },
        ["title"]
      )
    ).resolves.toBeUndefined();
    expect(io.logger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("record swallows a Payload failure when there is no transaction to lose", async () => {
    const io = makeIo(async () => sourceDoc);
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new APIError("rejected")) });
    const service = new ProvenanceService(store, schemaMap, {}, io);

    await expect(
      service.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        { title: "fp" },
        ["title"]
      ),
      "no transaction carried the caller's work, so a lost receipt must not cost them anything"
    ).resolves.toBeUndefined();
    expect(io.logger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("record rethrows a Payload failure raised inside the caller's transaction", async () => {
    const io = makeIo(async () => sourceDoc);
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new APIError("rejected")) });
    const service = new ProvenanceService(store, schemaMap, { transactionID: "tx-1" }, io);

    await expect(
      service.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        { title: "fp" },
        ["title"]
      )
    ).rejects.toThrow(APIError);
  });

  it("record stays best-effort inside a transaction when the failure reached no Payload operation", async () => {
    const io = makeIo(async () => sourceDoc);
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new TranslatorBug("table down")) });
    const service = new ProvenanceService(store, schemaMap, { transactionID: "tx-1" }, io);

    await expect(
      service.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        { title: "fp" },
        ["title"]
      )
    ).resolves.toBeUndefined();
  });

  it("dismiss persists the current source fingerprint for a locale that has a record", async () => {
    const dismiss = vi.fn().mockResolvedValue(undefined);
    const store = makeStore({ find: vi.fn().mockResolvedValue(record()), dismiss });
    const service = new ProvenanceService(
      store,
      schemaMap,
      {},
      makeIo(async () => sourceDoc)
    );

    await service.dismiss({ collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" });

    expect(dismiss).toHaveBeenCalledTimes(1);
    const [key, fingerprint] = dismiss.mock.calls[0];
    expect(key).toEqual({ collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" });
    expect(fingerprint, "a later source edit must be able to move past the dismissal").toEqual({
      kind: "fields",
      hashes: service.captureFingerprint(COLLECTION, sourceDoc),
    });
  });

  describe("record merges rather than replaces — a partial run must not claim the whole document", () => {
    const key = {
      collectionSlug: COLLECTION,
      documentId: "1",
      targetLocale: "de",
      sourceLocale: "en",
    };
    const storedWith = (hashes: Record<string, string>) =>
      makeStore({
        find: vi.fn().mockResolvedValue(record({ sourceFingerprint: { kind: "fields", hashes } })),
        upsert: vi.fn().mockResolvedValue(undefined),
      });

    it("takes the current hash for a leaf it translated", async () => {
      const store = storedWith({ title: "old", body: "old-body" });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, { title: "new", body: "old-body" }, ["title"]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { kind: "fields", hashes: { title: "new", body: "old-body" } },
        })
      );
    });

    it("keeps the stored hash for a leaf it skipped, even though the source moved", async () => {
      const store = storedWith({ title: "old", body: "old-body" });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, { title: "new", body: "moved" }, ["title"]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { kind: "fields", hashes: { title: "new", body: "old-body" } },
        })
      );
    });

    it("drops an address the document no longer has", async () => {
      const store = storedWith({ title: "old", gone: "stale" });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, { title: "new" }, ["title"]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ sourceFingerprint: { kind: "fields", hashes: { title: "new" } } })
      );
    });

    it("records only what it translated when the receipt predates per-field fingerprints", async () => {
      const store = makeStore({
        find: vi
          .fn()
          .mockResolvedValue(
            record({ sourceFingerprint: { kind: "document", hash: "a".repeat(64) } })
          ),
        upsert: vi.fn().mockResolvedValue(undefined),
      });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, { title: "new", body: "untouched" }, ["title"]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { kind: "fields", hashes: { title: "new", body: null } },
        })
      );
    });

    // Treating a read failure as "no receipt" would mark every leaf this run did not translate as
    // not-ours, erasing what earlier runs recorded.
    it("writes nothing when it cannot read the receipt it must merge into", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const store = makeStore({
        find: vi.fn().mockRejectedValue(new TranslatorBug("table down")),
        upsert,
      });
      const io = makeIo(async () => sourceDoc);
      const service = new ProvenanceService(store, schemaMap, {}, io);

      await expect(
        service.record(key, { title: "new", body: "old" }, ["title"])
      ).resolves.toBeUndefined();

      expect(
        upsert,
        "a half-known receipt is worse than the one already on disk"
      ).not.toHaveBeenCalled();
      expect(io.logger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });

    it("lets a read failure out when the caller's transaction is at stake", async () => {
      const store = makeStore({
        find: vi.fn().mockRejectedValue(new APIError("rejected")),
        upsert: vi.fn().mockResolvedValue(undefined),
      });
      const service = new ProvenanceService(
        store,
        schemaMap,
        { transactionID: "tx-1" },
        makeIo(async () => sourceDoc)
      );

      await expect(service.record(key, { title: "new" }, ["title"])).rejects.toThrow(APIError);
    });

    it("marks a leaf it saw and did not translate, rather than leaving it out", async () => {
      const store = makeStore({
        find: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(undefined),
      });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, { title: "new", body: "untouched" }, ["title"]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { kind: "fields", hashes: { title: "new", body: null } },
        })
      );
    });

    it("records only what it translated when there is no receipt at all", async () => {
      const store = makeStore({
        find: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(undefined),
      });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, { title: "new", body: "untouched" }, ["title"]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { kind: "fields", hashes: { title: "new", body: null } },
        })
      );
    });
  });

  describe("lastTranslatedFrom — the receipt, read best-effort", () => {
    const key = { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" };
    const stored = { kind: "fields", hashes: { title: "abc" } } as const;

    it("hands back the receipt when it can be read", async () => {
      const store = makeStore({
        find: vi.fn().mockResolvedValue(record({ sourceFingerprint: stored })),
      });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      expect(await service.lastTranslatedFrom(key)).toEqual(stored);
    });

    it("hands back nothing, and logs, when the sidecar cannot be reached", async () => {
      const io = makeIo(async () => sourceDoc);
      const store = makeStore({ find: vi.fn().mockRejectedValue(new TranslatorBug("table down")) });
      const service = new ProvenanceService(store, schemaMap, {}, io);

      await expect(service.lastTranslatedFrom(key)).resolves.toBeNull();
      expect(io.logger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });

    it("lets a failure out when the caller's transaction is at stake", async () => {
      const store = makeStore({ find: vi.fn().mockRejectedValue(new APIError("rejected")) });
      const service = new ProvenanceService(
        store,
        schemaMap,
        { transactionID: "tx-1" },
        makeIo(async () => sourceDoc)
      );

      await expect(service.lastTranslatedFrom(key)).rejects.toThrow(APIError);
    });
  });
});
