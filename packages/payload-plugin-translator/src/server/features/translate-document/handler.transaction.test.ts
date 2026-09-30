import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { TranslateDocumentHandler } from "./handler.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { TranslateDocumentInput } from "./model.js";
import type { ProvenanceServiceFactory } from "../../modules/provenance/index.js";

vi.mock("../../../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue({ title: "Titel" }),
}));

const TX = "tx-42";

describe("TranslateDocumentHandler — the caller's transaction", () => {
  let handler: TranslateDocumentHandler;
  let payload: Payload;

  const input = (over: Partial<TranslateDocumentInput> = {}): TranslateDocumentInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    strategy: "overwrite",
    publishOnTranslation: false,
    ...over,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };
    const schemaMap = new Map([
      ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }]],
    ]) as CollectionSchemaMap;

    payload = {
      findByID: vi.fn().mockResolvedValue({ id: "doc-123", title: "Test" }),
      update: vi.fn().mockResolvedValue({}),
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      collections: {
        posts: { config: { versions: { drafts: true } } },
      },
    } as unknown as Payload;

    handler = new TranslateDocumentHandler(provider, schemaMap);
  });

  it("joins the source read to it", async () => {
    await handler.handle(payload, input(), { transactionID: TX });

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", req: { transactionID: TX } })
    );
  });

  it("joins the target read to it", async () => {
    await handler.handle(payload, input(), { transactionID: TX });

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "de", req: { transactionID: TX } })
    );
  });

  // The write has to join it too: it targets the very document the caller has not committed yet, so
  // from outside the transaction there is nothing to update.
  it("joins the translation write to it", async () => {
    await handler.handle(payload, input(), { transactionID: TX });

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ req: { transactionID: TX } })
    );
  });

  it("joins the publish write to it", async () => {
    await handler.handle(payload, input({ publishOnTranslation: true }), { transactionID: TX });

    const publishCall = (payload.update as ReturnType<typeof vi.fn>).mock.calls.find(
      ([args]) => (args as { publishSpecificLocale?: string }).publishSpecificLocale === "de"
    );
    expect(publishCall).toBeDefined();
    expect(publishCall?.[0]).toMatchObject({ req: { transactionID: TX } });
  });

  it("builds the provenance service on it, so the receipt rolls back with the translation", async () => {
    const serviceFactory = vi.fn().mockReturnValue({
      captureFingerprint: vi.fn().mockReturnValue("fp"),
      record: vi.fn(),
    });
    const provenanceHandler = new TranslateDocumentHandler(
      { translate: vi.fn().mockResolvedValue({}) },
      new Map([
        ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }]],
      ]) as CollectionSchemaMap,
      serviceFactory as unknown as ProvenanceServiceFactory
    );

    await provenanceHandler.handle(payload, input(), { transactionID: TX });

    expect(serviceFactory).toHaveBeenCalledWith(payload, { transactionID: TX });
  });

  it("sends no transactionID when the caller has none", async () => {
    await handler.handle(payload, input(), {});

    for (const [args] of (payload.findByID as ReturnType<typeof vi.fn>).mock.calls) {
      expect((args as { req: object }).req).toEqual({});
    }
  });
});
