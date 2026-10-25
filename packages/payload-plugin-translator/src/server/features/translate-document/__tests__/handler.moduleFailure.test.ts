import type { CollectionSlug, Payload } from "payload";
import { APIError } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { ChainMember } from "../../../modules/translation-run/index.js";
import { TranslateDocumentHandler } from "../handler.js";
import type { TranslateDocumentInput } from "../model.js";

vi.mock("../../../../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue({
    translatedData: { title: "Titel" },
    leaves: [{ idPath: "title", answeredInFull: true }],
  }),
}));

const INSIDE_THE_EDITORS_SAVE = { transactionID: "tx-42" };

const input = (): TranslateDocumentInput => ({
  collection: "posts" as CollectionSlug,
  collectionId: "doc-123",
  sourceLng: "en",
  targetLng: "de",
  publishOnTranslation: false,
  previousAttempts: 0,
});

const failingAt = (position: "beforeTranslation" | "afterSave", error: unknown): ChainMember => ({
  name: "bad",
  [position]: async () => {
    throw error;
  },
});

describe("a module that fails while the editor's save is still open", () => {
  let payload: Payload;
  let provider: TranslationProvider;
  let schemaMap: CollectionSchemaMap;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = { translate: vi.fn().mockResolvedValue({}) };
    schemaMap = new Map([
      ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }]],
    ]) as CollectionSchemaMap;
    payload = {
      findByID: vi.fn().mockResolvedValue({ id: "doc-123", title: "Test" }),
      update: vi.fn().mockResolvedValue({}),
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      collections: { posts: { config: { versions: { drafts: true } } } },
    } as unknown as Payload;
  });

  const handlerWith = (member: ChainMember) =>
    new TranslateDocumentHandler({ translationProvider: provider, schemaMap, modules: [member] });

  it("lets the failure out rather than reporting success over a transaction it may have taken", async () => {
    const underTest = handlerWith(failingAt("beforeTranslation", new Error("boom")));

    await expect(underTest.handle(payload, input(), INSIDE_THE_EDITORS_SAVE)).rejects.toThrow(
      "boom"
    );
    expect(payload.update, "nothing was written").not.toHaveBeenCalled();
  });

  it("reports the failure rather than passing over it in silence", async () => {
    const underTest = handlerWith(failingAt("beforeTranslation", new Error("boom")));

    await expect(underTest.handle(payload, input(), INSIDE_THE_EDITORS_SAVE)).rejects.toThrow();

    expect(payload.logger.error).toHaveBeenCalledWith(expect.objectContaining({ module: "bad" }));
  });

  it("swallows that same failure when there is no transaction to lose", async () => {
    const underTest = handlerWith(failingAt("beforeTranslation", new Error("boom")));

    await expect(underTest.handle(payload, input())).resolves.toEqual({ success: true });
    expect(payload.update).toHaveBeenCalledTimes(1);
  });

  it("keeps the translation when a module fails after the save, outside a transaction", async () => {
    const underTest = handlerWith(failingAt("afterSave", new Error("boom")));

    await expect(underTest.handle(payload, input())).resolves.toEqual({ success: true });
    expect(payload.update).toHaveBeenCalledTimes(1);
  });

  it("lets out a failed Payload operation, which has already ended that transaction", async () => {
    const underTest = handlerWith(failingAt("beforeTranslation", new APIError("gone")));

    await expect(
      underTest.handle(payload, input(), INSIDE_THE_EDITORS_SAVE)
    ).rejects.toBeInstanceOf(APIError);
    expect(payload.update, "nothing was written").not.toHaveBeenCalled();
  });
});
