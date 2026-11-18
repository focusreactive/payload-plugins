import { describe, it, expect, vi } from "vitest";
import type { Field } from "payload";
import { APIError } from "payload";

import { TranslatorBug } from "../../../../core/errors/index.js";
import type { ProvenanceReceipt } from "../../../../core/domain/provenance/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";

import { DocumentStaleness } from "../DocumentStaleness.service.js";
import type { DocumentStalenessIo } from "../DocumentStaleness.service.js";
import { ProvenanceRecorder } from "../ProvenanceRecorder.service.js";
import { asHash } from "../../../../core/domain/provenance/__tests__/fixtures/claims.js";
import { storeDouble } from "../../../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";
import { fingerprintsOf } from "./fixtures/fingerprinter.js";

const hashed = (fields: Record<string, string>) =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

const COLLECTION = "posts";
const schema: Field[] = [{ name: "title", type: "text", localized: true }];
const schemaMap = new Map([[COLLECTION, schema]]) as CollectionSchemaMap;
const sourceDoc = { id: "1", title: "Hello" };

const makeStore = storeDouble;

function makeIo(
  read: (args: { locale: string }) => Promise<Record<string, unknown> | null>
): DocumentStalenessIo & { logger: { error: ReturnType<typeof vi.fn> } } {
  return {
    logger: { error: vi.fn() },
    readSource: vi.fn(({ locale }: { locale: string }) => read({ locale })),
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

describe("DocumentStaleness", () => {
  it("measures against exactly what a recorder captured — one fingerprinter, two halves", async () => {
    const recorder = new ProvenanceRecorder(
      makeStore(),
      {},
      {
        logger: { error: vi.fn() },
        fingerprintOf: fingerprintsOf(schemaMap),
      }
    );
    const whatTheRunClaimed = recorder.captureFingerprint(COLLECTION, sourceDoc);
    expect(whatTheRunClaimed).toEqual(expect.objectContaining({ title: expect.any(String) }));

    const storeOf = () =>
      makeStore({
        findByDocument: vi
          .fn()
          .mockResolvedValue([record({ sourceFingerprint: whatTheRunClaimed! })]),
      });

    const unchanged = await new DocumentStaleness(
      storeOf(),
      {},
      makeIo(async () => sourceDoc)
    ).getStaleness(COLLECTION, "1");
    expect(unchanged).toEqual([
      {
        targetLocale: "de",
        sourceLocale: "en",
        isStale: false,
        translatedAt: record().translatedAt,
        changedLeaves: [],
      },
    ]);

    const drifted = await new DocumentStaleness(
      storeOf(),
      {},
      makeIo(async () => ({ id: "1", title: "Changed" }))
    ).getStaleness(COLLECTION, "1");
    expect(drifted[0].isStale).toBe(true);
  });

  it("names the leaves that moved, so a field tree can mark them", async () => {
    const store = makeStore({
      findByDocument: vi
        .fn()
        .mockResolvedValue([record({ sourceFingerprint: hashed({ title: "ace" }) })]),
    });
    const staleness = new DocumentStaleness(
      store,
      {},
      makeIo(async () => ({ id: "1", title: "Moved on" }))
    );

    expect((await staleness.getStaleness(COLLECTION, "1"))[0].changedLeaves).toEqual(["title"]);
  });

  it("names no leaves when nothing can be read from the receipt", async () => {
    const store = makeStore({
      findByDocument: vi.fn().mockResolvedValue([record({ sourceFingerprint: null })]),
    });
    const staleness = new DocumentStaleness(
      store,
      {},
      makeIo(async () => sourceDoc)
    );

    const [locale] = await staleness.getStaleness(COLLECTION, "1");

    expect(locale.isStale, "a digest still says the document moved").toBe(true);
    expect(locale.changedLeaves, "but not where").toBeUndefined();
  });

  it("drops a locale it cannot recompute and keeps going", async () => {
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
    const staleness = new DocumentStaleness(store, {}, io);

    const locales = await staleness.getStaleness(COLLECTION, "1");

    expect(
      locales.map((l) => l.targetLocale),
      "no transaction carried this read, so one unreadable locale must not cost the others"
    ).toEqual(["fr"]);
    expect(io.logger.error).toHaveBeenCalled();
  });

  it("lets a foreign failure out when the caller is in a transaction", async () => {
    const fromPayload = new APIError("relation does not exist");
    const store = makeStore({ findByDocument: vi.fn().mockResolvedValue([record()]) });
    const io = makeIo(async () => {
      throw fromPayload;
    });
    const staleness = new DocumentStaleness(store, { transactionID: "tx-1" }, io);

    await expect(
      staleness.getStaleness(COLLECTION, "1"),
      "the read ran inside the caller's transaction, which Payload has now rolled back"
    ).rejects.toBe(fromPayload);
  });

  it("swallows one of ours even inside the caller's transaction", async () => {
    const store = makeStore({ findByDocument: vi.fn().mockResolvedValue([record()]) });
    const io = makeIo(async () => {
      throw new TranslatorBug("fingerprint blew up");
    });
    const staleness = new DocumentStaleness(store, { transactionID: "tx-1" }, io);

    await expect(staleness.getStaleness(COLLECTION, "1")).resolves.toEqual([]);
  });

  it("dismiss re-bases the receipt, touching nothing a run may have just written", async () => {
    const rebaseSourceFingerprint = vi.fn().mockResolvedValue(undefined);
    const upsert = vi.fn();
    const store = makeStore({
      find: vi.fn().mockResolvedValue(record()),
      rebaseSourceFingerprint,
      upsert,
    });
    const staleness = new DocumentStaleness(
      store,
      {},
      makeIo(async () => sourceDoc)
    );

    await staleness.dismiss({ collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" });

    expect(rebaseSourceFingerprint).toHaveBeenCalledWith(
      { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" },
      fingerprintsOf(schemaMap)(COLLECTION, sourceDoc)
    );
    expect(
      upsert,
      "replacing the row would undo a run that finished mid-dismissal"
    ).not.toHaveBeenCalled();
  });
});
