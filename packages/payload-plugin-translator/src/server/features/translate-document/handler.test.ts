import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";
import { APIError } from "payload";
import { TranslateDocumentHandler } from "./handler";
import type { TranslationProvider } from "../../../core/translation-providers";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TranslateDocumentInput } from "./model";

// Mock the translation core — the handler's unit tests isolate its
// orchestration (fetch / strategy plumbing / save), not the pipeline itself.
// translateContent returns the translated data directly, or null when there is
// nothing to translate.
vi.mock("../../../core/translation-pipeline", () => ({
  translateContent: vi.fn().mockResolvedValue(null),
}));

// Provenance fingerprinting is the core's job and tested there; here we pin a fixed hash so the
// handler test asserts only the record the handler builds and hands to the store.
vi.mock("../../../core/content-projection/computeSourceFingerprint", () => ({
  computeSourceFingerprint: vi.fn(() => "fp-fixed"),
}));

describe("TranslateDocumentHandler", () => {
  let handler: TranslateDocumentHandler;
  let mockTranslationProvider: TranslationProvider;
  let mockSchemaMap: CollectionSchemaMap;
  let mockPayload: Payload;

  const createInput = (
    overrides: Partial<TranslateDocumentInput> = {}
  ): TranslateDocumentInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    strategy: "overwrite",
    publishOnTranslation: false,
    ...overrides,
  });

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
    it("throws APIError when collection not in schemaMap", async () => {
      const input = createInput({ collection: "unknown" as CollectionSlug });

      await expect(handler.handle(mockPayload, input)).rejects.toThrow(APIError);
      await expect(handler.handle(mockPayload, input)).rejects.toThrow(
        'Collection "unknown" not found in schemaMap'
      );
    });
  });

  describe("document fetching", () => {
    it("fetches source document with source locale", async () => {
      const input = createInput({ sourceLng: "en" });

      await handler.handle(mockPayload, input);

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: "posts",
        id: "doc-123",
        locale: "en",
        depth: 0,
      });
    });

    it("fetches target document with target locale and no fallback", async () => {
      const input = createInput({ targetLng: "de" });

      await handler.handle(mockPayload, input);

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: "posts",
        id: "doc-123",
        locale: "de",
        fallbackLocale: false,
        depth: 0,
      });
    });
  });

  describe("translateContent invocation", () => {
    it("forwards fetched docs, strategy and locales to translateContent", async () => {
      const { translateContent } = await import("../../../core/translation-pipeline");
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
  });

  describe("success responses", () => {
    it("returns success when no translation needed (pipeline returns null)", async () => {
      const { translateContent } = await import("../../../core/translation-pipeline");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const input = createInput();

      const result = await handler.handle(mockPayload, input);

      expect(result).toEqual({ success: true });
      expect(mockPayload.update).not.toHaveBeenCalled();
    });

    it("returns success after saving translated document", async () => {
      const { translateContent } = await import("../../../core/translation-pipeline");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        title: "Übersetzter Titel",
      });

      const input = createInput();
      const result = await handler.handle(mockPayload, input);

      expect(result).toEqual({ success: true });
    });
  });

  describe("saving translated documents", () => {
    beforeEach(async () => {
      const { translateContent } = await import("../../../core/translation-pipeline");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        title: "Translated",
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

    it("saves document without autosave when versions not enabled", async () => {
      const input = createInput();

      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: false,
        })
      );
    });

    it("sets _status to draft when versions with drafts enabled", async () => {
      (mockPayload.collections["posts"].config as { versions: unknown }).versions = {
        drafts: true,
      };

      const input = createInput();
      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            _status: "draft",
          }),
        })
      );
    });

    it("sets _status to published when publishOnTranslation is true", async () => {
      (mockPayload.collections["posts"].config as { versions: unknown }).versions = {
        drafts: true,
      };

      const input = createInput({ publishOnTranslation: true });
      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            _status: "published",
          }),
        })
      );
    });

    it("uses autosave when drafts with autosave enabled and not publishing", async () => {
      (mockPayload.collections["posts"].config as { versions: unknown }).versions = {
        drafts: { autosave: true },
      };

      const input = createInput();
      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: true,
        })
      );
    });

    it("does not use autosave when publishing", async () => {
      (mockPayload.collections["posts"].config as { versions: unknown }).versions = {
        drafts: { autosave: true },
      };

      const input = createInput({ publishOnTranslation: true });
      await handler.handle(mockPayload, input);

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: false,
        })
      );
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
    let storeFactory: ReturnType<typeof vi.fn>;

    const makeHandlerWithProvenance = () =>
      new TranslateDocumentHandler(
        mockTranslationProvider,
        mockSchemaMap,
        storeFactory as unknown as (payload: typeof mockPayload) => typeof store
      );

    beforeEach(() => {
      store = {
        upsert: vi.fn(),
        find: vi.fn(),
        findByDocument: vi.fn(),
        dismiss: vi.fn(),
        deleteByDocument: vi.fn(),
      };
      storeFactory = vi.fn(() => store);
    });

    const withTranslatedData = async () => {
      const { translateContent } = await import("../../../core/translation-pipeline");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        title: "Hallo",
      });
    };

    it("upserts a provenance record after a successful translation", async () => {
      await withTranslatedData();
      const { computeSourceFingerprint } =
        await import("../../../core/content-projection/computeSourceFingerprint");
      // Distinguish source vs. target findByID calls by locale so this assertion actually
      // proves the handler fingerprints the source document, not the target one.
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

      expect(computeSourceFingerprint).toHaveBeenCalledWith({ id: "doc-123", title: "Source" }, [
        { name: "title", type: "text", localized: true },
      ]);
      expect(storeFactory).toHaveBeenCalledWith(mockPayload);
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionSlug: "posts",
          documentId: "doc-123",
          targetLocale: "de",
          sourceLocale: "en",
          sourceFingerprint: "fp-fixed",
          dismissedFingerprint: null,
        })
      );
      const record = store.upsert.mock.calls[0][0] as { translatedAt: string };
      expect(new Date(record.translatedAt).toISOString()).toBe(record.translatedAt);
    });

    it("fingerprints the PRISTINE source, before the pipeline can mutate it in place", async () => {
      // Regression: the pipeline translates in place and shares object-valued source leaves (e.g.
      // richText nodes) by reference with sourceData. If the handler fingerprints the source AFTER
      // translateContent, the baseline captures the target translation and every fresh translation
      // is instantly reported stale. The baseline must be the untranslated source.
      const { translateContent } = await import("../../../core/translation-pipeline");
      const { computeSourceFingerprint } =
        await import("../../../core/content-projection/computeSourceFingerprint");

      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockImplementation(
        ({ locale }: { locale: string }) =>
          Promise.resolve(
            locale === "en"
              ? { id: "doc-123", title: "Original source" }
              : { id: "doc-123", title: "Target" }
          )
      );

      // Emulate the real pipeline: mutate the source argument, then return the translated shape.
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ sourceData }: { sourceData: Record<string, unknown> }) => {
          sourceData.title = "TRANSLATED (pipeline mutation)";
          return { title: "TRANSLATED (pipeline mutation)" };
        }
      );

      // Snapshot exactly what the fingerprint saw, at call time.
      let fingerprintedDoc: unknown;
      (computeSourceFingerprint as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (doc: unknown) => {
          fingerprintedDoc = structuredClone(doc);
          return "fp-fixed";
        }
      );

      await makeHandlerWithProvenance().handle(
        mockPayload,
        createInput({ collection: "posts" as CollectionSlug, sourceLng: "en", targetLng: "de" })
      );

      expect(fingerprintedDoc).toEqual({ id: "doc-123", title: "Original source" });
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ sourceFingerprint: "fp-fixed" })
      );
    });

    it("does not record provenance when no store factory is supplied (disabled)", async () => {
      await withTranslatedData();
      // handler built without the factory (default in beforeEach) — provenance off.
      await handler.handle(mockPayload, createInput());

      expect(store.upsert).not.toHaveBeenCalled();
    });

    it("does not record provenance when nothing was translated (pipeline returns null)", async () => {
      const { translateContent } = await import("../../../core/translation-pipeline");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await makeHandlerWithProvenance().handle(mockPayload, createInput());

      expect(storeFactory).not.toHaveBeenCalled();
      expect(store.upsert).not.toHaveBeenCalled();
    });

    it("does not fail the translation when the provenance write throws (best-effort + logged)", async () => {
      await withTranslatedData();
      store.upsert.mockRejectedValue(new Error("provenance table down"));

      const result = await makeHandlerWithProvenance().handle(mockPayload, createInput());

      expect(result).toEqual({ success: true });
      expect(
        (mockPayload as unknown as { logger: { error: ReturnType<typeof vi.fn> } }).logger.error
      ).toHaveBeenCalled();
    });
  });
});
