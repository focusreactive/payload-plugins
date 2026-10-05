import {
  TranslatorBug,
  TranslatorConfigError,
  mustPropagate,
} from "../../../../core/errors/index.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";
import { APIError } from "payload";
import { TranslateDocumentHandler } from "../handler.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../../types/AutoTranslateContext.js";
import type { ProvenanceStore } from "../../../../core/domain/provenance/index.js";
import { ProvenanceService, provenanceIo } from "../../../modules/provenance/index.js";
import type { ProvenanceServiceFactory } from "../../../modules/provenance/index.js";
import type { TranslateDocumentInput } from "../model.js";

vi.mock("../../../../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../../../core/domain/content-projection/computeFieldFingerprints.js", () => ({
  computeFieldFingerprints: vi.fn(() => ({ title: "fp-fixed" })),
}));
vi.mock("../../../../core/domain/content-projection/computeSourceFingerprint.js", () => ({
  computeSourceFingerprint: vi.fn(() => "fp-fixed"),
}));

describe("TranslateDocumentHandler", () => {
  let handler: TranslateDocumentHandler;
  let mockTranslationProvider: TranslationProvider;
  let mockSchemaMap: CollectionSchemaMap;
  let mockPayload: Payload;

  const TARGET_LNG = "de";

  const createInput = (
    overrides: Partial<TranslateDocumentInput> = {}
  ): TranslateDocumentInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: TARGET_LNG,
    strategy: "overwrite",
    publishOnTranslation: false,
    ...overrides,
  });

  const enableDrafts = (drafts: unknown = true) => {
    (mockPayload.collections["posts"].config as { versions: unknown }).versions = { drafts };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTranslationProvider = {
      translate: vi.fn().mockResolvedValue({}),
    };

    mockSchemaMap = new Map([
      ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }]],
      ["pages" as CollectionSlug, [{ name: "content", type: "richText", localized: true }]],
    ]) as CollectionSchemaMap;

    mockPayload = {
      findByID: vi.fn().mockResolvedValue({ id: "doc-123", title: "Test" }),
      update: vi.fn().mockResolvedValue({}),
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      collections: {
        posts: {
          config: {
            versions: undefined,
          },
        },
        pages: {
          config: {
            versions: {
              drafts: true,
            },
          },
        },
      },
    } as unknown as Payload;

    handler = new TranslateDocumentHandler(mockTranslationProvider, mockSchemaMap);
  });

  describe("schema validation", () => {
    it("refuses a collection the schema map does not know", async () => {
      const input = createInput({ collection: "unknown" as CollectionSlug });

      await expect(handler.handle(mockPayload, input)).rejects.toThrow(TranslatorConfigError);
      await expect(handler.handle(mockPayload, input)).rejects.toThrow(
        'Collection "unknown" not found in schemaMap'
      );
    });
  });

  describe("document fetching", () => {
    it("reads the source as the current version of that locale only", async () => {
      const input = createInput({ sourceLng: "en" });

      await handler.handle(mockPayload, input);

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        req: {},
        collection: "posts",
        id: "doc-123",
        locale: "en",
        depth: 0,
        disableErrors: true,
        draft: true,
        fallbackLocale: false,
      });
    });

    it("names the locale that was actually refused, not always the source", async () => {
      vi.mocked(mockPayload.findByID)
        .mockResolvedValueOnce({ id: "doc-123", title: "Test" } as never)
        .mockResolvedValueOnce(null as never);

      const thrown = await handler
        .handle(mockPayload, createInput({ sourceLng: "en", targetLng: "de" }))
        .catch((e: unknown) => e);

      expect((thrown as Error).message).toContain('locale "de"');
      expect((thrown as Error).message).not.toContain('locale "en"');
    });

    it("fetches target document with target locale and no fallback", async () => {
      const input = createInput({ targetLng: "de" });

      await handler.handle(mockPayload, input);

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        req: {},
        collection: "posts",
        id: "doc-123",
        locale: "de",
        fallbackLocale: false,
        depth: 0,
        disableErrors: true,
        draft: true,
      });
    });

    it("reads the target exactly once, even on the publish path", async () => {
      enableDrafts();

      await handler.handle(mockPayload, createInput({ publishOnTranslation: true }));

      const targetReads = vi
        .mocked(mockPayload.findByID)
        .mock.calls.filter(([args]) => args.locale === TARGET_LNG);
      expect(targetReads).toHaveLength(1);
    });
  });

  describe("translateContent invocation", () => {
    it("forwards fetched docs, strategy and locales to translateContent", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const input = createInput({
        sourceLng: "en",
        targetLng: "fr",
        strategy: "overwrite",
      });

      await handler.handle(mockPayload, input);

      expect(translateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: [{ name: "title", type: "text", localized: true }],
          sourceData: { id: "doc-123", title: "Test" },
          targetData: { id: "doc-123", title: "Test" },
          sourceLng: "en",
          targetLng: "fr",
          strategy: "overwrite",
          translationProvider: mockTranslationProvider,
        })
      );
    });

    it("turns a bare error from the host's provider into one of ours", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      const fromHost = new Error("the host's own provider blew up");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(fromHost);

      const thrown = await handler.handle(mockPayload, createInput()).catch((e: unknown) => e);

      expect(
        mustPropagate(thrown),
        "an unwrapped provider failure would read as foreign and fail the editor's save"
      ).toBe(false);
      expect((thrown as Error).cause).toBe(fromHost);
    });

    it("leaves a Payload failure raised inside the host's provider foreign", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      const fromPayload = new APIError("relation does not exist", 500);
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(fromPayload);

      const thrown = await handler.handle(mockPayload, createInput()).catch((e: unknown) => e);

      expect(
        mustPropagate(thrown),
        "a provider that calls Payload can kill the caller's transaction, so its failure must still surface"
      ).toBe(true);
    });
  });

  describe("success responses", () => {
    it("returns success when no translation needed (pipeline returns null)", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const input = createInput();

      const result = await handler.handle(mockPayload, input);

      expect(result).toEqual({ success: true });
      expect(mockPayload.update).not.toHaveBeenCalled();
    });

    it("returns success after saving translated document", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        translatedData: { title: "Übersetzter Titel" },
        translatedPaths: ["title"],
      });

      const input = createInput();
      const result = await handler.handle(mockPayload, input);

      expect(result).toEqual({ success: true });
    });
  });

  describe("saving translated documents", () => {
    beforeEach(async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        translatedData: { title: "Translated" },
        translatedPaths: ["title"],
      });
    });

    it("saves document with target locale and source as fallback", async () => {
      const input = createInput({ sourceLng: "en", targetLng: "fr" });

      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "posts",
          id: "doc-123",
          locale: "fr",
          fallbackLocale: "en",
        })
      );
    });

    it("marks its write with the auto-translate skip flag so the hook never re-triggers (loop guard set-side)", async () => {
      const input = createInput();

      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true },
        })
      );
    });

    it("saves document without autosave when versions not enabled", async () => {
      const input = createInput();

      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: false,
        })
      );
    });

    it("spreads the draft-mode layer onto the update and sends no _status", async () => {
      enableDrafts();

      await handler.handle(mockPayload, createInput());

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: true,
          data: expect.not.objectContaining({ _status: expect.anything() }),
        })
      );
    });

    it("spreads the publish-mode layer onto the update, target locale and status included", async () => {
      enableDrafts();

      await handler.handle(mockPayload, createInput({ publishOnTranslation: true }));

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          publishSpecificLocale: TARGET_LNG,
          data: expect.objectContaining({ _status: "published" }),
        })
      );
    });

    it("uses autosave when drafts with autosave enabled and not publishing", async () => {
      enableDrafts({ autosave: true });

      const input = createInput();
      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: true,
        })
      );
    });

    it("keeps the collection's autosave setting on the translation write when publishing", async () => {
      enableDrafts({ autosave: true });

      const input = createInput({ publishOnTranslation: true });
      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({ draft: true, autosave: true })
      );
    });
  });

  describe("publishing", () => {
    const nothingToTranslate = async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    };

    const publishCalls = () =>
      vi.mocked(mockPayload.update).mock.calls.filter(([args]) => "publishSpecificLocale" in args);

    it("publishes the target locale even when there was nothing to translate", async () => {
      enableDrafts();
      await nothingToTranslate();

      await handler.handle(mockPayload, createInput({ publishOnTranslation: true }));

      expect(publishCalls()).toHaveLength(1);
      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { _status: "published" },
          publishSpecificLocale: "de",
          locale: "de",
        })
      );
    });

    it("marks the publish write as translator-authored, so the auto-translate hook skips it", async () => {
      enableDrafts();
      await nothingToTranslate();

      await handler.handle(mockPayload, createInput({ publishOnTranslation: true }));

      const [args] = publishCalls()[0];
      expect(args.context).toEqual({ [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true });
    });

    it("does not publish when the flag is off", async () => {
      enableDrafts();

      await handler.handle(mockPayload, createInput({ publishOnTranslation: false }));

      expect(publishCalls()).toHaveLength(0);
    });

    it("does not scope a publish on a collection without drafts", async () => {
      await handler.handle(mockPayload, createInput({ publishOnTranslation: true }));

      expect(publishCalls()).toHaveLength(0);
    });
  });

  describe("provenance recording", () => {
    let store: {
      upsert: ReturnType<typeof vi.fn>;
      find: ReturnType<typeof vi.fn>;
      findByDocument: ReturnType<typeof vi.fn>;
      dismiss: ReturnType<typeof vi.fn>;
      deleteByDocument: ReturnType<typeof vi.fn>;
    };
    let serviceFactory: ReturnType<typeof vi.fn>;

    const makeHandlerWithProvenance = () =>
      new TranslateDocumentHandler(
        mockTranslationProvider,
        mockSchemaMap,
        serviceFactory as unknown as ProvenanceServiceFactory
      );

    beforeEach(() => {
      store = {
        upsert: vi.fn(),
        find: vi.fn(),
        findByDocument: vi.fn(),
        dismiss: vi.fn(),
        deleteByDocument: vi.fn(),
      };
      // A real `ProvenanceService` over a mock store: the record's shape is the service's policy,
      // not the handler's.
      serviceFactory = vi.fn(
        (payload) =>
          new ProvenanceService(
            store as unknown as ProvenanceStore,
            mockSchemaMap,
            {},
            provenanceIo(payload)
          )
      );
    });

    const withTranslatedData = async (translatedPaths: string[] = ["title"]) => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        translatedData: { title: "Hallo" },
        translatedPaths,
      });
    };

    it("upserts a provenance record after a successful translation", async () => {
      await withTranslatedData();
      const { computeFieldFingerprints } =
        await import("../../../../core/domain/content-projection/computeFieldFingerprints.js");
      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockImplementation(
        ({ locale }: { locale: string }) =>
          Promise.resolve(
            locale === "en"
              ? { id: "doc-123", title: "Source" }
              : { id: "doc-123", title: "Target" }
          )
      );
      const handlerWithProvenance = makeHandlerWithProvenance();

      await handlerWithProvenance.handle(
        mockPayload,
        createInput({ collection: "posts" as CollectionSlug, sourceLng: "en", targetLng: "de" })
      );

      expect(computeFieldFingerprints).toHaveBeenCalledWith({ id: "doc-123", title: "Source" }, [
        { name: "title", type: "text", localized: true },
      ]);
      expect(serviceFactory).toHaveBeenCalledWith(mockPayload, {});
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionSlug: "posts",
          documentId: "doc-123",
          targetLocale: "de",
          sourceLocale: "en",
          sourceFingerprint: { kind: "fields", hashes: { title: "fp-fixed" } },
          dismissedFingerprint: null,
        })
      );
      const record = store.upsert.mock.calls[0][0] as { translatedAt: string };
      expect(
        new Date(record.translatedAt).toISOString(),
        "translatedAt is stored as an ISO-8601 string"
      ).toBe(record.translatedAt);
    });

    it("fingerprints the source document, not whatever the pipeline hands back", async () => {
      // The real pipeline no longer mutates `sourceData` (it detaches object-valued leaves); the
      // hostile stub below keeps a handler-level guard in case that regresses.
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      const { computeFieldFingerprints } =
        await import("../../../../core/domain/content-projection/computeFieldFingerprints.js");

      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockImplementation(
        ({ locale }: { locale: string }) =>
          Promise.resolve(
            locale === "en"
              ? { id: "doc-123", title: "Original source" }
              : { id: "doc-123", title: "Target" }
          )
      );

      // Deliberately hostile: writes into the argument it was given.
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ sourceData }: { sourceData: Record<string, unknown> }) => {
          sourceData.title = "TRANSLATED (pipeline mutation)";
          return {
            translatedData: { title: "TRANSLATED (pipeline mutation)" },
            translatedPaths: ["title"],
          };
        }
      );

      let fingerprintedDoc: unknown;
      (computeFieldFingerprints as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (doc: unknown) => {
          fingerprintedDoc = structuredClone(doc);
          return { title: "fp-fixed" };
        }
      );

      await makeHandlerWithProvenance().handle(
        mockPayload,
        createInput({ collection: "posts" as CollectionSlug, sourceLng: "en", targetLng: "de" })
      );

      expect(fingerprintedDoc).toEqual({ id: "doc-123", title: "Original source" });
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { kind: "fields", hashes: { title: "fp-fixed" } },
        })
      );
    });

    it("does not record provenance when no store factory is supplied (disabled)", async () => {
      await withTranslatedData();
      // handler built without the factory (default in beforeEach) — provenance off.
      await handler.handle(mockPayload, createInput());

      expect(store.upsert).not.toHaveBeenCalled();
    });

    it("does not record provenance when nothing was translated (pipeline returns null)", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await makeHandlerWithProvenance().handle(mockPayload, createInput());

      // The service factory may be called (to attempt a fingerprint capture), but with nothing
      // translated there is no record — the store is never written.
      expect(store.upsert).not.toHaveBeenCalled();
    });

    it("does not fail the translation when the provenance write throws (best-effort + logged)", async () => {
      await withTranslatedData();
      store.upsert.mockRejectedValue(new TranslatorBug("provenance table down"));

      const result = await makeHandlerWithProvenance().handle(mockPayload, createInput());

      expect(result).toEqual({ success: true });
      expect(
        (mockPayload as unknown as { logger: { error: ReturnType<typeof vi.fn> } }).logger.error
      ).toHaveBeenCalled();
    });
  });

  describe("what the handler tells provenance about the run", () => {
    it("claims the leaf the pipeline sent and marks the one it did not", async () => {
      // The module mock returns a fixed map, so it has to name BOTH leaves — otherwise `tagline`
      // could never reach the receipt whatever the merge rule did, and this would pass on the mock.
      const { computeFieldFingerprints } =
        await import("../../../../core/domain/content-projection/computeFieldFingerprints.js");
      (computeFieldFingerprints as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        title: "fp-title",
        tagline: "fp-tagline",
      });

      const store = {
        upsert: vi.fn(),
        find: vi.fn().mockResolvedValue(null),
        findByDocument: vi.fn(),
        dismiss: vi.fn(),
        deleteByDocument: vi.fn(),
      };
      const serviceFactory = vi.fn(
        (payload) =>
          new ProvenanceService(
            store as unknown as ProvenanceStore,
            mockSchemaMap,
            {},
            provenanceIo(payload)
          )
      );
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        translatedData: { title: "Hallo" },
        translatedPaths: ["title"],
      });
      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "doc-123",
        title: "Source",
        tagline: "Untouched",
      });

      const underTest = new TranslateDocumentHandler(
        mockTranslationProvider,
        mockSchemaMap,
        serviceFactory as unknown as ProvenanceServiceFactory
      );
      await underTest.handle(mockPayload, createInput({}));

      expect(store.upsert).toHaveBeenCalledTimes(1);
      const written = store.upsert.mock.calls[0][0] as {
        sourceFingerprint: { kind: string; hashes: Record<string, string | null> };
      };
      expect(written.sourceFingerprint).toEqual({
        kind: "fields",
        hashes: { title: "fp-title", tagline: null },
      });
    });

    it("hands the pipeline the leaves the receipt can answer for, and no others", async () => {
      const store = {
        upsert: vi.fn(),
        find: vi.fn().mockResolvedValue({
          collectionSlug: "pages",
          documentId: "doc-123",
          targetLocale: "de",
          sourceLocale: "en",
          sourceFingerprint: { kind: "fields", hashes: { title: "stale-hash" } },
          translatedAt: "2026-07-07T00:00:00.000Z",
          dismissedFingerprint: null,
        }),
        findByDocument: vi.fn(),
        dismiss: vi.fn(),
        deleteByDocument: vi.fn(),
      };
      const serviceFactory = vi.fn(
        (payload) =>
          new ProvenanceService(
            store as unknown as ProvenanceStore,
            mockSchemaMap,
            {},
            provenanceIo(payload)
          )
      );
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        translatedData: { title: "Hallo" },
        translatedPaths: ["title"],
      });
      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "doc-123",
        title: "Source",
      });

      const underTest = new TranslateDocumentHandler(
        mockTranslationProvider,
        mockSchemaMap,
        serviceFactory as unknown as ProvenanceServiceFactory
      );
      await underTest.handle(mockPayload, createInput({}));

      const passed = (translateContent as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        sourceChangedByLeaf?: Record<string, boolean>;
      };
      expect(passed.sourceChangedByLeaf).toEqual({ title: true });
    });
  });

  it("translates anyway when the prior receipt cannot be read", async () => {
    const store = {
      upsert: vi.fn(),
      find: vi.fn().mockRejectedValue(new Error("sidecar unavailable")),
      findByDocument: vi.fn(),
      dismiss: vi.fn(),
      deleteByDocument: vi.fn(),
    };
    const serviceFactory = vi.fn(
      (payload) =>
        new ProvenanceService(
          store as unknown as ProvenanceStore,
          mockSchemaMap,
          {},
          provenanceIo(payload)
        )
    );
    const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
    (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      translatedData: { title: "Hallo" },
      translatedPaths: ["title"],
    });
    (mockPayload.findByID as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "doc-123",
      title: "Source",
    });

    const underTest = new TranslateDocumentHandler(
      mockTranslationProvider,
      mockSchemaMap,
      serviceFactory as unknown as ProvenanceServiceFactory
    );

    await expect(underTest.handle(mockPayload, createInput({}))).resolves.toEqual({
      success: true,
    });
    expect(mockPayload.update, "the translation must still be saved").toHaveBeenCalled();
  });
});
