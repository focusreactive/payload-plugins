import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { translateDocument } from "../translateDocument.js";
import type { TranslateDocumentDeps } from "../translateDocument.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TaskHandlerInput } from "../../../modules/task-runner/index.js";
import type { ProvenanceServiceFactory } from "../../../modules/provenance/index.js";
import { provenanceInAChain } from "../../../modules/provenance/__tests__/fixtures/inAChain.js";

vi.mock("../../../../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue({
    translatedData: { title: "Titel" },
    leaves: [{ idPath: "title", answeredInFull: true }],
  }),
}));

const TX = "tx-42";

describe("translateDocument — the caller's transaction", () => {
  let deps: TranslateDocumentDeps;
  let payload: Payload;

  const input = (over: Partial<TaskHandlerInput> = {}): TaskHandlerInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    publishOnTranslation: false,
    previousAttempts: 0,
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

    deps = { translationProvider: provider, schemaMap };
  });

  it("joins the source read to it", async () => {
    await translateDocument(deps, payload, input(), { transactionID: TX });

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", req: { transactionID: TX } })
    );
  });

  it("joins the target read to it", async () => {
    await translateDocument(deps, payload, input(), { transactionID: TX });

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "de", req: { transactionID: TX } })
    );
  });

  // The write has to join it too: it targets the very document the caller has not committed yet, so
  // from outside the transaction there is nothing to update.
  it("joins the translation write to it", async () => {
    await translateDocument(deps, payload, input(), { transactionID: TX });

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ req: { transactionID: TX } })
    );
  });

  it("joins the publish write to it", async () => {
    await translateDocument(deps, payload, input({ publishOnTranslation: true }), {
      transactionID: TX,
    });

    const publishCall = (payload.update as ReturnType<typeof vi.fn>).mock.calls.find(
      ([args]) => (args as { publishSpecificLocale?: string }).publishSpecificLocale === "de"
    );
    expect(publishCall).toBeDefined();
    expect(publishCall?.[0]).toMatchObject({ req: { transactionID: TX } });
  });

  it("builds the provenance service on it, so the receipt rolls back with the translation", async () => {
    const serviceFactory = vi.fn().mockReturnValue({
      captureFingerprint: vi.fn().mockReturnValue({ title: "fp" }),
      lastTranslatedFrom: vi.fn().mockResolvedValue(null),
      record: vi.fn(),
    });
    const provenanceDeps: TranslateDocumentDeps = {
      translationProvider: { translate: vi.fn().mockResolvedValue({}) },
      schemaMap: new Map([
        ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }]],
      ]) as CollectionSchemaMap,
      modules: provenanceInAChain(serviceFactory as unknown as ProvenanceServiceFactory),
    };

    await translateDocument(provenanceDeps, payload, input(), { transactionID: TX });

    expect(serviceFactory).toHaveBeenCalledWith(payload, { transactionID: TX });
  });

  it("sends no transactionID when the caller has none", async () => {
    await translateDocument(deps, payload, input(), {});

    for (const [args] of (payload.findByID as ReturnType<typeof vi.fn>).mock.calls) {
      expect((args as { req: object }).req).toEqual({});
    }
  });
});
