import {
  TranslatorBug,
  TranslatorConfigError,
  mustPropagate,
} from "../../../../core/errors/index.js";
import { describe, it, expect, vi, beforeEach, onTestFinished } from "vitest";
import type { Mock } from "vitest";
import type { Payload, CollectionSlug } from "payload";
import { APIError } from "payload";
import type { RecordedFingerprints } from "../../../../core/domain/provenance/index.js";
import { translateDocument } from "../translateDocument.js";
import type { TranslateDocumentDeps } from "../translateDocument.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../../types/AutoTranslateContext.js";
import { ProvenanceRecorder, recorderIo } from "../../../modules/provenance/index.js";
import type { ProvenanceRecorderFactory } from "../../../modules/provenance/index.js";
import type { TranslateDocumentInput } from "../translateDocument.js";
import { provenanceInAChain } from "../../../modules/provenance/__tests__/fixtures/inAChain.js";
import { storeDouble } from "../../../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";
import type { ProvenanceStore } from "../../../../core/domain/provenance/index.js";
import { fingerprintsOf } from "../../../modules/provenance/__tests__/fixtures/fingerprinter.js";
import {
  nothingSent,
  pipelineResult,
  unanswered,
} from "../../../../core/translation-pipeline/__tests__/fixtures/pipelineResult.js";

vi.mock("../../../../core/translation-pipeline/index.js", async () => {
  const fixture =
    await import("../../../../core/translation-pipeline/__tests__/fixtures/pipelineResult.js");
  return { translateContent: vi.fn().mockResolvedValue(fixture.nothingSent) };
});

vi.mock("../../../../core/domain/content-projection/computeFieldFingerprints.js", () => ({
  fingerprintFieldContents: vi.fn(() => ({ title: "fp-fixed" })),
  HASH_LENGTH: 16,
  SOURCE_HASH_PATTERN: /^[0-9a-f]{16}$/u,
}));
vi.mock("../../../../core/domain/content-projection/translatableFields.js", async (original) => {
  const actual =
    await original<
      typeof import("../../../../core/domain/content-projection/translatableFields.js")
    >();
  return { ...actual, translatableFields: vi.fn(actual.translatableFields) };
});
vi.mock("../../../../core/domain/content-projection/computeSourceFingerprint.js", () => ({
  computeSourceFingerprint: vi.fn(() => "fp-fixed"),
}));

describe("translateDocument", () => {
  let deps: TranslateDocumentDeps;
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
    publishOnTranslation: false,
    previousAttempts: 0,
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

    deps = {
      translationProvider: mockTranslationProvider,
      schemaMap: mockSchemaMap,
    };
  });

  describe("a leaf whose value kept its source text", () => {
    it("logs the document, the locale, the leaf and the failure code", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        pipelineResult({ title: "Translated" }, [unanswered("title", "missing-segment")])
      );

      await translateDocument(deps, mockPayload, createInput(), {});

      expect(mockPayload.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "posts",
          documentId: "doc-123",
          targetLocale: TARGET_LNG,
          idPath: "title",
          code: "missing-segment",
          msg: expect.any(String),
        })
      );
    });
  });

  describe("schema validation", () => {
    it("refuses a collection the schema map does not know", async () => {
      const input = createInput({ collection: "unknown" as CollectionSlug });

      await expect(translateDocument(deps, mockPayload, input, {})).rejects.toThrow(
        TranslatorConfigError
      );
      await expect(translateDocument(deps, mockPayload, input, {})).rejects.toThrow(
        'Collection "unknown" not found in schemaMap'
      );
    });
  });

  describe("document fetching", () => {
    it("reads the source as the current version of that locale only", async () => {
      const input = createInput({ sourceLng: "en" });

      await translateDocument(deps, mockPayload, input, {});

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

      const thrown = await translateDocument(
        deps,
        mockPayload,
        createInput({ sourceLng: "en", targetLng: "de" }),
        {}
      ).catch((e: unknown) => e);

      expect((thrown as Error).message).toContain('locale "de"');
      expect((thrown as Error).message).not.toContain('locale "en"');
    });

    it("fetches target document with target locale and no fallback", async () => {
      const input = createInput({ targetLng: "de" });

      await translateDocument(deps, mockPayload, input, {});

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

      await translateDocument(deps, mockPayload, createInput({ publishOnTranslation: true }), {});

      const targetReads = vi
        .mocked(mockPayload.findByID)
        .mock.calls.filter(([args]) => args.locale === TARGET_LNG);
      expect(targetReads).toHaveLength(1);
    });
  });

  describe("translateContent invocation", () => {
    it("forwards fetched docs, strategy and locales to translateContent", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(nothingSent);

      const input = createInput({
        sourceLng: "en",
        targetLng: "fr",
      });

      await translateDocument(deps, mockPayload, input, {});

      expect(translateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: [{ name: "title", type: "text", localized: true }],
          sourceData: { id: "doc-123", title: "Test" },
          targetData: { id: "doc-123", title: "Test" },
          sourceLng: "en",
          targetLng: "fr",
          translationProvider: mockTranslationProvider,
        })
      );
    });

    it("turns a bare error from the host's provider into one of ours", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      const fromHost = new Error("the host's own provider blew up");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(fromHost);

      const thrown = await translateDocument(deps, mockPayload, createInput(), {}).catch(
        (e: unknown) => e
      );

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

      const thrown = await translateDocument(deps, mockPayload, createInput(), {}).catch(
        (e: unknown) => e
      );

      expect(
        mustPropagate(thrown),
        "a provider that calls Payload can kill the caller's transaction, so its failure must still surface"
      ).toBe(true);
    });
  });

  describe("success responses", () => {
    it("returns success when no translation needed (nothing was sent)", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(nothingSent);

      const input = createInput();

      const result = await translateDocument(deps, mockPayload, input, {});

      expect(result).toBeUndefined();
      expect(mockPayload.update).not.toHaveBeenCalled();
    });

    it("returns success after saving translated document", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        pipelineResult({ title: "Übersetzter Titel" })
      );

      const input = createInput();
      const result = await translateDocument(deps, mockPayload, input, {});

      expect(result).toBeUndefined();
    });
  });

  describe("saving translated documents", () => {
    beforeEach(async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        pipelineResult({ title: "Translated" })
      );
    });

    it("saves document with target locale and source as fallback", async () => {
      const input = createInput({ sourceLng: "en", targetLng: "fr" });

      await translateDocument(deps, mockPayload, input, {});

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

      await translateDocument(deps, mockPayload, input, {});

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true },
        })
      );
    });

    it("saves document without autosave when versions not enabled", async () => {
      const input = createInput();

      await translateDocument(deps, mockPayload, input, {});

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: false,
        })
      );
    });

    it("spreads the draft-mode layer onto the update and sends no _status", async () => {
      enableDrafts();

      await translateDocument(deps, mockPayload, createInput(), {});

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: true,
          data: expect.not.objectContaining({ _status: expect.anything() }),
        })
      );
    });

    it("spreads the publish-mode layer onto the update, target locale and status included", async () => {
      enableDrafts();

      await translateDocument(deps, mockPayload, createInput({ publishOnTranslation: true }), {});

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
      await translateDocument(deps, mockPayload, input, {});

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: true,
        })
      );
    });

    it("keeps the collection's autosave setting on the translation write when publishing", async () => {
      enableDrafts({ autosave: true });

      const input = createInput({ publishOnTranslation: true });
      await translateDocument(deps, mockPayload, input, {});

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({ draft: true, autosave: true })
      );
    });
  });

  describe("publishing", () => {
    const nothingToTranslate = async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(nothingSent);
    };

    const publishCalls = () =>
      vi.mocked(mockPayload.update).mock.calls.filter(([args]) => "publishSpecificLocale" in args);

    it("publishes the target locale even when there was nothing to translate", async () => {
      enableDrafts();
      await nothingToTranslate();

      await translateDocument(deps, mockPayload, createInput({ publishOnTranslation: true }), {});

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

      await translateDocument(deps, mockPayload, createInput({ publishOnTranslation: true }), {});

      const [args] = publishCalls()[0];
      expect(args.context).toEqual({ [AUTO_TRANSLATE_SKIP_CONTEXT_KEY]: true });
    });

    it("does not publish when the flag is off", async () => {
      enableDrafts();

      await translateDocument(deps, mockPayload, createInput({ publishOnTranslation: false }), {});

      expect(publishCalls()).toHaveLength(0);
    });

    it("does not scope a publish on a collection without drafts", async () => {
      await translateDocument(deps, mockPayload, createInput({ publishOnTranslation: true }), {});

      expect(publishCalls()).toHaveLength(0);
    });
  });

  describe("provenance recording", () => {
    let store: ReturnType<typeof storeDouble>;
    let recorderFactory: Mock<ProvenanceRecorderFactory>;

    const depsWithProvenance = (): TranslateDocumentDeps => ({
      translationProvider: mockTranslationProvider,
      schemaMap: mockSchemaMap,
      modules: provenanceInAChain(recorderFactory),
    });

    beforeEach(() => {
      store = storeDouble();
      recorderFactory = vi.fn<ProvenanceRecorderFactory>(
        (payload) =>
          new ProvenanceRecorder(
            store as unknown as ProvenanceStore,
            {},
            recorderIo(payload, fingerprintsOf(mockSchemaMap))
          )
      );
    });

    const withTranslatedData = async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        pipelineResult({ title: "Hallo" })
      );
    };

    it("upserts a provenance record after a successful translation", async () => {
      await withTranslatedData();
      const { translatableFields } =
        await import("../../../../core/domain/content-projection/translatableFields.js");
      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockImplementation(
        ({ locale }: { locale: string }) =>
          Promise.resolve(
            locale === "en"
              ? { id: "doc-123", title: "Source" }
              : { id: "doc-123", title: "Target" }
          )
      );
      const provenanceDeps = depsWithProvenance();

      await translateDocument(
        provenanceDeps,
        mockPayload,
        createInput({ collection: "posts" as CollectionSlug, sourceLng: "en", targetLng: "de" }),
        {}
      );

      expect(translatableFields).toHaveBeenCalledWith(
        { id: "doc-123", title: "Source" },
        [{ name: "title", type: "text", localized: true }],
        expect.anything()
      );
      const [given, scope] = recorderFactory.mock.calls[0];
      expect(scope).toEqual({});
      expect(
        Object.getPrototypeOf(given),
        "a module is handed a guarded view of the run's payload, not the payload itself"
      ).toBe(mockPayload);
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionSlug: "posts",
          documentId: "doc-123",
          targetLocale: "de",
          sourceLocale: "en",
          sourceFingerprint: { title: "fp-fixed" },
        })
      );
      const record = store.upsert.mock.calls[0][0] as { translatedAt: string };
      expect(
        new Date(record.translatedAt).toISOString(),
        "translatedAt is stored as an ISO-8601 string"
      ).toBe(record.translatedAt);
    });

    it("fingerprints the source document, not whatever the pipeline hands back", async () => {
      // The real pipeline does not mutate `sourceData`; the hostile stub guards against that regressing.
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      const { translatableFields } =
        await import("../../../../core/domain/content-projection/translatableFields.js");

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
          return pipelineResult({ title: "TRANSLATED (pipeline mutation)" });
        }
      );

      let fingerprintedDoc: unknown;
      const spy = vi.mocked(translatableFields);
      const asItReallyIs = spy.getMockImplementation();
      spy.mockImplementation((doc, schema, walk) => {
        fingerprintedDoc = structuredClone(doc);
        return asItReallyIs?.(doc, schema, walk) ?? [];
      });
      onTestFinished(() => {
        if (asItReallyIs) spy.mockImplementation(asItReallyIs);
      });

      await translateDocument(
        depsWithProvenance(),
        mockPayload,
        createInput({ collection: "posts" as CollectionSlug, sourceLng: "en", targetLng: "de" }),
        {}
      );

      expect(fingerprintedDoc).toEqual({ id: "doc-123", title: "Original source" });
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceFingerprint: { title: "fp-fixed" },
        })
      );
    });

    it("does not record provenance when no store factory is supplied (disabled)", async () => {
      await withTranslatedData();
      await translateDocument(deps, mockPayload, createInput(), {});

      expect(store.upsert).not.toHaveBeenCalled();
    });

    it("does not record provenance when nothing was translated (nothing was sent)", async () => {
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(nothingSent);

      await translateDocument(depsWithProvenance(), mockPayload, createInput(), {});

      expect(store.upsert).not.toHaveBeenCalled();
    });

    it("does not fail the translation when the provenance write throws (best-effort + logged)", async () => {
      await withTranslatedData();
      store.upsert.mockRejectedValue(new TranslatorBug("provenance table down"));

      const result = await translateDocument(depsWithProvenance(), mockPayload, createInput(), {});

      expect(result).toBeUndefined();
      expect(
        (mockPayload as unknown as { logger: { error: ReturnType<typeof vi.fn> } }).logger.error
      ).toHaveBeenCalled();
    });
  });

  describe("what the run tells provenance", () => {
    it("claims the leaf the pipeline sent and leaves the one it did not unanswered", async () => {
      const { fingerprintFieldContents } =
        await import("../../../../core/domain/content-projection/computeFieldFingerprints.js");
      (fingerprintFieldContents as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        title: "fp-title",
        tagline: "fp-tagline",
      });

      const store = storeDouble();
      const recorderFactory = vi.fn<ProvenanceRecorderFactory>(
        (payload) =>
          new ProvenanceRecorder(
            store as unknown as ProvenanceStore,
            {},
            recorderIo(payload, fingerprintsOf(mockSchemaMap))
          )
      );
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        pipelineResult({ title: "Hallo" })
      );
      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "doc-123",
        title: "Source",
        tagline: "Untouched",
      });

      const underTest: TranslateDocumentDeps = {
        translationProvider: mockTranslationProvider,
        schemaMap: mockSchemaMap,
        modules: provenanceInAChain(recorderFactory),
      };
      await translateDocument(underTest, mockPayload, createInput({}), {});

      expect(store.upsert).toHaveBeenCalledTimes(1);
      const written = store.upsert.mock.calls[0][0] as {
        sourceFingerprint: RecordedFingerprints;
      };
      expect(written.sourceFingerprint).toEqual({ title: "fp-title", tagline: "!unanswered" });
    });

    it("hands the pipeline every translatable leaf when the request named none", async () => {
      const store = storeDouble({
        find: vi.fn().mockResolvedValue({
          collectionSlug: "pages",
          documentId: "doc-123",
          targetLocale: "de",
          sourceLocale: "en",
          sourceFingerprint: { title: "stale-hash" },
          translatedAt: "2026-07-07T00:00:00.000Z",
        }),
      });
      const recorderFactory = vi.fn<ProvenanceRecorderFactory>(
        (payload) =>
          new ProvenanceRecorder(
            store as unknown as ProvenanceStore,
            {},
            recorderIo(payload, fingerprintsOf(mockSchemaMap))
          )
      );
      const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
      (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        pipelineResult({ title: "Hallo" })
      );
      (mockPayload.findByID as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "doc-123",
        title: "Source",
      });

      const underTest: TranslateDocumentDeps = {
        translationProvider: mockTranslationProvider,
        schemaMap: mockSchemaMap,
        modules: provenanceInAChain(recorderFactory),
      };
      await translateDocument(underTest, mockPayload, createInput({}), {});

      const passed = (translateContent as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        selection?: readonly string[];
      };
      expect(passed.selection).toEqual(["title"]);
    });
  });

  it("translates anyway when the prior receipt cannot be read", async () => {
    const store = storeDouble({
      find: vi.fn().mockRejectedValue(new Error("sidecar unavailable")),
    });
    const recorderFactory = vi.fn<ProvenanceRecorderFactory>(
      (payload) =>
        new ProvenanceRecorder(
          store as unknown as ProvenanceStore,
          {},
          recorderIo(payload, fingerprintsOf(mockSchemaMap))
        )
    );
    const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
    (translateContent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      pipelineResult({ title: "Hallo" })
    );
    (mockPayload.findByID as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "doc-123",
      title: "Source",
    });

    const underTest: TranslateDocumentDeps = {
      translationProvider: mockTranslationProvider,
      schemaMap: mockSchemaMap,
      modules: provenanceInAChain(recorderFactory),
    };

    await expect(
      translateDocument(underTest, mockPayload, createInput({}), {})
    ).resolves.toBeUndefined();
    expect(mockPayload.update, "the translation must still be saved").toHaveBeenCalled();
  });
});
