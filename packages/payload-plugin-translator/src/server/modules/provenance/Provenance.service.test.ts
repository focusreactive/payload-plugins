import { describe, it, expect, vi } from "vitest";
import type { Field, Payload } from "payload";

import type { ProvenanceStore, TranslationProvenanceRecord } from "../../../core/provenance";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";

import { ProvenanceService } from "./Provenance.service";

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

function makePayload(findByID: (args: { locale: string }) => Promise<unknown>): Payload {
  return {
    findByID: vi.fn(findByID),
    logger: { error: vi.fn() },
  } as unknown as Payload;
}

const record = (over: Partial<TranslationProvenanceRecord> = {}): TranslationProvenanceRecord => ({
  collectionSlug: COLLECTION,
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: "x",
  translatedAt: "2026-07-15T00:00:00.000Z",
  dismissedFingerprint: null,
  ...over,
});

describe("ProvenanceService", () => {
  it("captureFingerprint returns null for a collection with no schema", () => {
    const service = new ProvenanceService(
      makePayload(async () => sourceDoc),
      makeStore(),
      schemaMap
    );
    expect(service.captureFingerprint("unknown", sourceDoc)).toBeNull();
  });

  it("write capture and read recompute hash identically — the one-owner invariant", async () => {
    // The fingerprint the write path would store for the pristine source...
    const captureService = new ProvenanceService(
      makePayload(async () => sourceDoc),
      makeStore(),
      schemaMap
    );
    const writeFingerprint = captureService.captureFingerprint(COLLECTION, sourceDoc);
    expect(typeof writeFingerprint).toBe("string");

    // ...must make the read path report NOT stale when the live source is unchanged.
    const freshStore = makeStore({
      findByDocument: vi.fn().mockResolvedValue([record({ sourceFingerprint: writeFingerprint! })]),
    });
    const freshService = new ProvenanceService(
      makePayload(async () => sourceDoc),
      freshStore,
      schemaMap
    );
    const fresh = await freshService.getStaleness(COLLECTION, "1");
    expect(fresh).toEqual([
      { target_lng: "de", source_lng: "en", is_stale: false, translated_at: record().translatedAt },
    ]);

    // ...and stale once the live source drifts.
    const driftStore = makeStore({
      findByDocument: vi.fn().mockResolvedValue([record({ sourceFingerprint: writeFingerprint! })]),
    });
    const driftService = new ProvenanceService(
      makePayload(async () => ({ id: "1", title: "Changed" })),
      driftStore,
      schemaMap
    );
    const drifted = await driftService.getStaleness(COLLECTION, "1");
    expect(drifted[0].is_stale).toBe(true);
  });

  it("record is best-effort — a store failure is caught and logged, not thrown", async () => {
    const payload = makePayload(async () => sourceDoc);
    const store = makeStore({ upsert: vi.fn().mockRejectedValue(new Error("table down")) });
    const service = new ProvenanceService(payload, store, schemaMap);

    await expect(
      service.record(
        { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
        "fp"
      )
    ).resolves.toBeUndefined();
    expect(payload.logger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("dismiss persists the current source fingerprint for a locale that has a record", async () => {
    const dismiss = vi.fn().mockResolvedValue(undefined);
    const store = makeStore({ find: vi.fn().mockResolvedValue(record()), dismiss });
    const service = new ProvenanceService(
      makePayload(async () => sourceDoc),
      store,
      schemaMap
    );

    await service.dismiss({ collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" });

    expect(dismiss).toHaveBeenCalledTimes(1);
    const [key, fingerprint] = dismiss.mock.calls[0];
    expect(key).toEqual({ collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" });
    expect(typeof fingerprint).toBe("string");
  });
});
