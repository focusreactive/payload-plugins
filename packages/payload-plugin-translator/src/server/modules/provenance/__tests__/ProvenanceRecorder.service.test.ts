import { describe, it, expect, vi } from "vitest";
import type { Field } from "payload";
import { APIError } from "payload";

import { TranslatorBug } from "../../../../core/errors/index.js";
import type { ProvenanceReceipt } from "../../../../core/domain/provenance/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { LeafOutcome } from "../../../../core/translation-pipeline/types/index.js";

import { ProvenanceRecorder } from "../ProvenanceRecorder.service.js";
import type { RecorderIo } from "../ProvenanceRecorder.service.js";
import { asHash } from "../../../../core/domain/provenance/__tests__/fixtures/claims.js";
import { makeIdPath } from "../../../../core/domain/content-projection/idPath.js";
import { UNANSWERED } from "../../../../core/domain/provenance/SourceFingerprint.js";
import { storeDouble } from "../../../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";
import { fingerprintsOf } from "./fixtures/fingerprinter.js";

const answered = (name: string): LeafOutcome => ({
  idPath: makeIdPath([{ kind: "key", name }]),
  answered: true,
});

const answeredInPart = (name: string): LeafOutcome => ({
  idPath: makeIdPath([{ kind: "key", name }]),
  answered: false,
  failures: [{ code: "missing-segment" }],
});

const hashed = (fields: Record<string, string>) =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

const COLLECTION = "posts";
const schema: Field[] = [{ name: "title", type: "text", localized: true }];
const schemaMap = new Map([[COLLECTION, schema]]) as CollectionSchemaMap;
const sourceDoc = { id: "1", title: "Hello" };

const makeStore = storeDouble;

function makeIo(): RecorderIo & { logger: { error: ReturnType<typeof vi.fn> } } {
  return {
    logger: { error: vi.fn() },
    fingerprintOf: fingerprintsOf(schemaMap),
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

describe("ProvenanceRecorder", () => {
  it("captureFingerprint returns null for a collection with no schema", () => {
    const recorder = new ProvenanceRecorder(makeStore(), {}, makeIo());
    expect(recorder.captureFingerprint("unknown", sourceDoc)).toBeNull();
  });

  it("records a receipt built only from what it was handed", async () => {
    const store = makeStore({
      find: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
    });
    const recorder = new ProvenanceRecorder(store, {}, makeIo());

    const captured = recorder.captureFingerprint(COLLECTION, sourceDoc);
    await recorder.record(
      { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
      captured!,
      [answered("title")]
    );

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ sourceFingerprint: captured })
    );
  });

  it("record is best-effort — a store failure of ours is caught and logged, not thrown", async () => {
    const io = makeIo();
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new TranslatorBug("table down")) });
    const recorder = new ProvenanceRecorder(store, {}, io);

    await expect(
      recorder.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        hashed({ title: "face" }),
        [answered("title")]
      )
    ).resolves.toBeUndefined();
    expect(io.logger.error).toHaveBeenCalled();
  });

  it("record swallows a Payload failure when there is no transaction to lose", async () => {
    const io = makeIo();
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new APIError("rejected")) });
    const recorder = new ProvenanceRecorder(store, {}, io);

    await expect(
      recorder.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        hashed({ title: "face" }),
        [answered("title")]
      ),
      "no transaction carried the caller's work, so a lost receipt must not cost them anything"
    ).resolves.toBeUndefined();
    expect(io.logger.error).toHaveBeenCalled();
  });

  it("record rethrows a Payload failure raised inside the caller's transaction", async () => {
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new APIError("rejected")) });
    const recorder = new ProvenanceRecorder(store, { transactionID: "tx-1" }, makeIo());

    await expect(
      recorder.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        hashed({ title: "face" }),
        [answered("title")]
      )
    ).rejects.toThrow(APIError);
  });

  it("record stays best-effort inside a transaction when the failure reached no Payload operation", async () => {
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new TranslatorBug("table down")) });
    const recorder = new ProvenanceRecorder(store, { transactionID: "tx-1" }, makeIo());

    await expect(
      recorder.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        hashed({ title: "face" }),
        [answered("title")]
      )
    ).resolves.toBeUndefined();
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
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      await recorder.record(key, hashed({ title: "feed", body: "dadbed" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: hashed({ title: "feed", body: "dadbed" }),
        })
      );
    });

    it("does not claim a leaf the provider answered only in part", async () => {
      const store = storedWith({ title: "dad" });
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      await recorder.record(key, hashed({ title: "feed" }), [answeredInPart("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ sourceFingerprint: { title: UNANSWERED } })
      );
    });

    it("keeps the claim already made for a leaf it did not send", async () => {
      const store = storedWith({ title: "dad", body: "dadbed" });
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      await recorder.record(key, hashed({ title: "feed", body: "deed" }), [answered("title")]);

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: hashed({ title: "feed", body: "dadbed" }),
        })
      );
    });

    it("drops an address the document no longer has", async () => {
      const store = storedWith({ title: "dad", gone: "fade" });
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      await recorder.record(key, hashed({ title: "feed" }), [answered("title")]);

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
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      await recorder.record(key, hashed({ title: "feed", body: "cafe" }), [answered("title")]);

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
      const io = makeIo();
      const recorder = new ProvenanceRecorder(store, {}, io);

      await expect(
        recorder.record(key, hashed({ title: "feed", body: "dad" }), [answered("title")])
      ).resolves.toBeUndefined();

      expect(
        upsert,
        "a half-known receipt is worse than the one already on disk"
      ).not.toHaveBeenCalled();
      expect(io.logger.error).toHaveBeenCalled();
    });

    it("lets a read failure out when the caller's transaction is at stake", async () => {
      const store = makeStore({
        find: vi.fn().mockRejectedValue(new APIError("rejected")),
        upsert: vi.fn().mockResolvedValue(undefined),
      });
      const recorder = new ProvenanceRecorder(store, { transactionID: "tx-1" }, makeIo());

      await expect(
        recorder.record(key, hashed({ title: "feed" }), [answered("title")])
      ).rejects.toThrow(APIError);
    });

    it("names a leaf it saw and did not send, rather than leaving it out", async () => {
      const store = makeStore({
        find: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(undefined),
      });
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      await recorder.record(key, hashed({ title: "feed", body: "cafe" }), [answered("title")]);

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
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      await recorder.record(key, hashed({ title: "feed", body: "cafe" }), [answered("title")]);

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
      const recorder = new ProvenanceRecorder(store, {}, makeIo());

      expect(await recorder.lastTranslatedFrom(key)).toEqual(stored);
    });

    it("hands back nothing, and logs, when the sidecar cannot be reached", async () => {
      const io = makeIo();
      const store = makeStore({ find: vi.fn().mockRejectedValue(new TranslatorBug("table down")) });
      const recorder = new ProvenanceRecorder(store, {}, io);

      await expect(recorder.lastTranslatedFrom(key)).resolves.toBeNull();
      expect(io.logger.error).toHaveBeenCalled();
    });

    it("lets a failure out when the caller's transaction is at stake", async () => {
      const store = makeStore({ find: vi.fn().mockRejectedValue(new APIError("rejected")) });
      const recorder = new ProvenanceRecorder(store, { transactionID: "tx-1" }, makeIo());

      await expect(recorder.lastTranslatedFrom(key)).rejects.toThrow(APIError);
    });
  });
});
