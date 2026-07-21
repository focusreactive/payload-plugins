import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Field, Payload, PayloadRequest } from "payload";

import { computeSourceFingerprint } from "../../../core/domain/content-projection/computeSourceFingerprint";
import type { ProvenanceStore, TranslationProvenanceRecord } from "../../../core/domain/provenance";
import { ProvenanceService } from "../../modules/provenance";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";

import { GetDocumentStalenessHandler } from "./getDocumentStaleness.handler";
import { DismissStalenessHandler } from "./dismissStaleness.handler";
import type { StalenessConfig } from "./model";

const COLLECTION = "posts";
const schema: Field[] = [{ name: "title", type: "text", localized: true }];
const sourceDoc = { id: "1", title: "Hello" };
// The fingerprint recorded at translation time — recomputed identically by the service.
const recordedFingerprint = computeSourceFingerprint(sourceDoc, schema);

function makeRecord(
  overrides: Partial<TranslationProvenanceRecord> = {}
): TranslationProvenanceRecord {
  return {
    collectionSlug: COLLECTION,
    documentId: "1",
    targetLocale: "de",
    sourceLocale: "en",
    sourceFingerprint: recordedFingerprint,
    translatedAt: "2026-07-07T00:00:00.000Z",
    dismissedFingerprint: null,
    ...overrides,
  };
}

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

let payload: Payload;
let logger: { error: ReturnType<typeof vi.fn> };

beforeEach(() => {
  logger = { error: vi.fn() };
  payload = {
    findByID: vi.fn().mockResolvedValue(sourceDoc),
    logger,
  } as unknown as Payload;
});

const schemaMap = new Map([["posts", schema]]) as CollectionSchemaMap;

function makeConfig(store: ProvenanceStore | null): StalenessConfig {
  return {
    availableCollections: new Set(["posts"]) as StalenessConfig["availableCollections"],
    // The fingerprint policy lives in ProvenanceService now; the handlers only delegate. Wrapping the
    // mock store in a real service keeps this suite exercising the full fetch+fingerprint+compare path.
    provenanceServiceFactory: store ? (p) => new ProvenanceService(p, store, schemaMap) : undefined,
  };
}

const readReq = (over: Record<string, unknown> = {}) =>
  ({
    payload,
    routeParams: { collection_slug: COLLECTION, collection_id: "1" },
    ...over,
  }) as unknown as PayloadRequest;

const dismissReq = (body: Record<string, unknown>) =>
  ({ payload, json: async () => body }) as unknown as PayloadRequest;

async function bodyOf(res: Response): Promise<any> {
  return (await res.json()).data;
}

describe("GetDocumentStalenessHandler", () => {
  it("reports is_stale=false when the source is unchanged (write-path recompute match)", async () => {
    const store = makeStore({ findByDocument: vi.fn().mockResolvedValue([makeRecord()]) });
    const res = await new GetDocumentStalenessHandler(makeConfig(store)).handle(readReq());
    const data = await bodyOf(res);
    expect(data.locales).toEqual([
      {
        target_lng: "de",
        source_lng: "en",
        is_stale: false,
        translated_at: "2026-07-07T00:00:00.000Z",
      },
    ]);
    // recompute must mirror the write path exactly: locale=sourceLocale, depth:0
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: COLLECTION, id: "1", locale: "en", depth: 0 })
    );
  });

  it("reports is_stale=true when the source drifted", async () => {
    const store = makeStore({
      findByDocument: vi.fn().mockResolvedValue([makeRecord({ sourceFingerprint: "fp-old" })]),
    });
    const res = await new GetDocumentStalenessHandler(makeConfig(store)).handle(readReq());
    expect((await bodyOf(res)).locales[0].is_stale).toBe(true);
  });

  it("omits locales with no provenance record (absent, not stale)", async () => {
    const store = makeStore({ findByDocument: vi.fn().mockResolvedValue([]) });
    const res = await new GetDocumentStalenessHandler(makeConfig(store)).handle(readReq());
    expect((await bodyOf(res)).locales).toEqual([]);
  });

  it("returns empty when provenance is disabled", async () => {
    const res = await new GetDocumentStalenessHandler(makeConfig(null)).handle(readReq());
    expect((await bodyOf(res)).locales).toEqual([]);
  });

  it("degrades to empty and logs when the store throws (e.g. missing table)", async () => {
    const store = makeStore({
      findByDocument: vi.fn().mockRejectedValue(new Error("relation does not exist")),
    });
    const res = await new GetDocumentStalenessHandler(makeConfig(store)).handle(readReq());
    expect(res.status).toBe(200);
    expect((await bodyOf(res)).locales).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });

  it("fetches the source once for multiple target locales sharing a source", async () => {
    const store = makeStore({
      findByDocument: vi.fn().mockResolvedValue([makeRecord(), makeRecord({ targetLocale: "fr" })]),
    });
    await new GetDocumentStalenessHandler(makeConfig(store)).handle(readReq());
    expect(payload.findByID).toHaveBeenCalledTimes(1);
  });

  it("skips only the locale whose source fetch fails, keeping the rest", async () => {
    const store = makeStore({
      findByDocument: vi
        .fn()
        .mockResolvedValue([makeRecord(), makeRecord({ targetLocale: "it", sourceLocale: "fr" })]),
    });
    (payload.findByID as ReturnType<typeof vi.fn>).mockImplementation(
      ({ locale }: { locale: string }) =>
        locale === "fr"
          ? Promise.reject(new Error("locale no longer configured"))
          : Promise.resolve(sourceDoc)
    );
    const res = await new GetDocumentStalenessHandler(makeConfig(store)).handle(readReq());
    expect((await bodyOf(res)).locales).toEqual([
      {
        target_lng: "de",
        source_lng: "en",
        is_stale: false,
        translated_at: "2026-07-07T00:00:00.000Z",
      },
    ]);
    expect(logger.error).toHaveBeenCalled();
  });

  it("rejects a collection that is not managed", async () => {
    const req = readReq({ routeParams: { collection_slug: "other", collection_id: "1" } });
    const res = await new GetDocumentStalenessHandler(makeConfig(makeStore())).handle(req);
    expect(res.status).toBe(400);
  });
});

describe("DismissStalenessHandler", () => {
  const body = { collection_slug: COLLECTION, collection_id: "1", target_lng: "de" };

  it("persists the current fingerprint as the dismissed fingerprint", async () => {
    const dismiss = vi.fn().mockResolvedValue(undefined);
    const store = makeStore({ find: vi.fn().mockResolvedValue(makeRecord()), dismiss });
    const res = await new DismissStalenessHandler(makeConfig(store)).handle(dismissReq(body));
    expect(res.status).toBe(200);
    expect(dismiss).toHaveBeenCalledWith(
      { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" },
      recordedFingerprint
    );
  });

  it("is a no-op when the locale has no record", async () => {
    const dismiss = vi.fn();
    const store = makeStore({ find: vi.fn().mockResolvedValue(null), dismiss });
    const res = await new DismissStalenessHandler(makeConfig(store)).handle(dismissReq(body));
    expect(res.status).toBe(200);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("rejects an invalid body", async () => {
    const store = makeStore();
    const res = await new DismissStalenessHandler(makeConfig(store)).handle(
      dismissReq({ collection_slug: COLLECTION })
    );
    expect(res.status).toBe(400);
  });

  it("rejects a collection that is not managed", async () => {
    const res = await new DismissStalenessHandler(makeConfig(makeStore())).handle(
      dismissReq({ ...body, collection_slug: "other" })
    );
    expect(res.status).toBe(400);
  });
});
