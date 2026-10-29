import { TranslatorBug } from "../../../../core/errors/index.js";
import { describe, it, expect, vi } from "vitest";
import type { Field } from "payload";
import { APIError } from "payload";

import type { ProvenanceReceipt } from "../../../../core/domain/provenance/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";

import { ProvenanceService } from "../Provenance.service.js";
import { asHash } from "../../../../core/domain/provenance/__tests__/fixtures/claims.js";
import { makeIdPath } from "../../../../core/domain/content-projection/idPath.js";
import { UNANSWERED } from "../../../../core/domain/provenance/SourceFingerprint.js";
import { storeDouble } from "../../../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";

const answered = (name: string) => ({
  idPath: makeIdPath([{ kind: "key", name }]),
  answeredInFull: true,
});

/* `TranslationPipeline` sets `answeredInFull: counts.written === counts.sent`, so a rich-text leaf
 * cut into paragraphs is answered in part whenever the provider returns fewer than it was sent. */
const answeredInPart = (name: string) => ({
  idPath: makeIdPath([{ kind: "key", name }]),
  answeredInFull: false,
});

const hashed = (fields: Record<string, string>) =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

const COLLECTION = "posts";
const schema: Field[] = [{ name: "title", type: "text", localized: true }];
const schemaMap = new Map([[COLLECTION, schema]]) as CollectionSchemaMap;
const sourceDoc = { id: "1", title: "Hello" };

const makeStore = storeDouble;

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
  sourceFingerprint: hashed({ title: "ace" }),
  translatedAt: "2026-07-15T00:00:00.000Z",
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
      findByDocument: vi.fn().mockResolvedValue([record({ sourceFingerprint: writeFingerprint! })]),
    });
    const freshService = new ProvenanceService(
      freshStore,
      schemaMap,
      {},
      makeIo(async () => sourceDoc)
    );
    const fresh = await freshService.getStaleness(COLLECTION, "1");
    expect(fresh).toEqual([
      {
        targetLocale: "de",
        sourceLocale: "en",
        isStale: false,
        translatedAt: record().translatedAt,
        changedLeaves: [],
      },
    ]);

    const driftStore = makeStore({
      findByDocument: vi.fn().mockResolvedValue([record({ sourceFingerprint: writeFingerprint! })]),
    });
    const driftService = new ProvenanceService(
      driftStore,
      schemaMap,
      {},
      makeIo(async () => ({ id: "1", title: "Changed" }))
    );
    const drifted = await driftService.getStaleness(COLLECTION, "1");
    expect(drifted[0].isStale).toBe(true);
  });

  it("names the leaves that moved, so a field tree can mark them", async () => {
    const store = makeStore({
      findByDocument: vi.fn().mockResolvedValue([
        record({
          sourceFingerprint: hashed({ title: "ace" }),
        }),
      ]),
    });
    const service = new ProvenanceService(
      store,
      schemaMap,
      {},
      makeIo(async () => ({ id: "1", title: "Moved on" }))
    );

    expect((await service.getStaleness(COLLECTION, "1"))[0].changedLeaves).toEqual(["title"]);
  });

  it("names no leaves when nothing can be read from the receipt", async () => {
    const store = makeStore({
      findByDocument: vi.fn().mockResolvedValue([record({ sourceFingerprint: null })]),
    });
    const service = new ProvenanceService(
      store,
      schemaMap,
      {},
      makeIo(async () => sourceDoc)
    );

    const [locale] = await service.getStaleness(COLLECTION, "1");

    expect(locale.isStale, "a digest still says the document moved").toBe(true);
    expect(locale.changedLeaves, "but not where").toBeUndefined();
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
      locales.map((l) => l.targetLocale),
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
        hashed({ title: "face" }),
        [answered("title")]
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
        hashed({ title: "face" }),
        [answered("title")]
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
        hashed({ title: "face" }),
        [answered("title")]
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
        hashed({ title: "face" }),
        [answered("title")]
      )
    ).resolves.toBeUndefined();
  });

  it("dismiss re-bases the receipt, touching nothing a run may have just written", async () => {
    const rebaseSourceFingerprint = vi.fn().mockResolvedValue(undefined);
    const upsert = vi.fn();
    const store = makeStore({
      find: vi.fn().mockResolvedValue(record()),
      rebaseSourceFingerprint,
      upsert,
    });
    const service = new ProvenanceService(
      store,
      schemaMap,
      {},
      makeIo(async () => sourceDoc)
    );

    await service.dismiss({ collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" });

    expect(rebaseSourceFingerprint).toHaveBeenCalledWith(
      { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" },
      service.captureFingerprint(COLLECTION, sourceDoc)
    );
    expect(
      upsert,
      "replacing the row would undo a run that finished mid-dismissal"
    ).not.toHaveBeenCalled();
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
        find: vi.fn().mockResolvedValue(record({ sourceFingerprint: hashed(hashes) })),
        upsert: vi.fn().mockResolvedValue(undefined),
      });

    it("takes the current hash for a leaf it translated", async () => {
      const store = storedWith({ title: "dad", body: "dadbed" });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, hashed({ title: "feed", body: "dadbed" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: hashed({ title: "feed", body: "dadbed" }),
        })
      );
    });

    it("does not claim a leaf the provider answered only in part", async () => {
      const store = storedWith({ title: "dad" });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, hashed({ title: "feed" }), [answeredInPart("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ sourceFingerprint: { title: UNANSWERED } })
      );
    });

    it("keeps the claim already made for a leaf it did not send", async () => {
      const store = storedWith({ title: "dad", body: "dadbed" });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, hashed({ title: "feed", body: "deed" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: hashed({ title: "feed", body: "dadbed" }),
        })
      );
    });

    it("drops an address the document no longer has", async () => {
      const store = storedWith({ title: "dad", gone: "fade" });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, hashed({ title: "feed" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: hashed({ title: "feed" }),
        })
      );
    });

    it("leaves a leaf it did not send unanswered when nothing can be read from the receipt", async () => {
      const store = makeStore({
        find: vi.fn().mockResolvedValue(record({ sourceFingerprint: null })),
        upsert: vi.fn().mockResolvedValue(undefined),
      });
      const service = new ProvenanceService(
        store,
        schemaMap,
        {},
        makeIo(async () => sourceDoc)
      );

      await service.record(key, hashed({ title: "feed", body: "cafe" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { ...hashed({ title: "feed" }), body: UNANSWERED },
        })
      );
    });

    it("writes nothing when it cannot read the receipt it must merge into", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const store = makeStore({
        find: vi.fn().mockRejectedValue(new TranslatorBug("table down")),
        upsert,
      });
      const io = makeIo(async () => sourceDoc);
      const service = new ProvenanceService(store, schemaMap, {}, io);

      await expect(
        service.record(key, hashed({ title: "feed", body: "dad" }), [answered("title")])
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

      await expect(
        service.record(key, hashed({ title: "feed" }), [answered("title")])
      ).rejects.toThrow(APIError);
    });

    it("names a leaf it saw and did not send, rather than leaving it out", async () => {
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

      await service.record(key, hashed({ title: "feed", body: "cafe" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { ...hashed({ title: "feed" }), body: UNANSWERED },
        })
      );
    });

    it("leaves a leaf it did not send unanswered when there is no receipt at all", async () => {
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

      await service.record(key, hashed({ title: "feed", body: "cafe" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { ...hashed({ title: "feed" }), body: UNANSWERED },
        })
      );
    });
  });

  describe("lastTranslatedFrom — the receipt, read best-effort", () => {
    const key = { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" };
    const stored = hashed({ title: "abc" });

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
