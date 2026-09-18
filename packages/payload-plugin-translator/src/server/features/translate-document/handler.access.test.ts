import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { TranslateDocumentHandler } from "./handler";
import type { TranslationProvider } from "../../../core/domain/translation-providers";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TranslateDocumentInput } from "./model";

vi.mock("../../../core/translation-pipeline", () => ({
  translateContent: vi.fn(),
}));

const pipeline = async () =>
  (await import("../../../core/translation-pipeline")).translateContent as ReturnType<typeof vi.fn>;

vi.mock("../../shared/payload/translationPermission", () => ({
  checkTranslationPermission: vi.fn(),
}));

const permission = async () =>
  (await import("../../shared/payload/translationPermission"))
    .checkTranslationPermission as ReturnType<typeof vi.fn>;

describe("TranslateDocumentHandler — it asks before it writes", () => {
  let handler: TranslateDocumentHandler;
  let payload: Payload;
  let provider: TranslationProvider;

  const input = (over: Partial<TranslateDocumentInput> = {}): TranslateDocumentInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    strategy: "overwrite",
    publishOnTranslation: false,
    ...over,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    (await pipeline()).mockResolvedValue({ title: "Titel", body: "Text" });
    provider = { translate: vi.fn().mockResolvedValue({}) };
    const schemaMap = new Map([
      ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }]],
    ]) as CollectionSchemaMap;

    payload = {
      findByID: vi.fn().mockResolvedValue({ id: "doc-123", title: "Test" }),
      update: vi.fn().mockResolvedValue({}),
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      collections: { posts: { config: { versions: { drafts: true } } } },
    } as unknown as Payload;

    handler = new TranslateDocumentHandler(provider, schemaMap);
    (await permission()).mockResolvedValue({ allowed: true, deniedFields: [] });
  });

  // Asking first is the whole design. Writing and catching would let Payload's `killTransaction` roll
  // back whatever transaction the request carries — on the inline path, the editor's own save.
  it("does not write when the permission check refuses", async () => {
    (await permission()).mockResolvedValue({ allowed: false, deniedFields: [] });

    await handler.handle(payload, input(), {}).catch(() => undefined);

    expect(payload.update).not.toHaveBeenCalled();
  });

  it("fails with a reason a reader can act on, not a bare failure", async () => {
    (await permission()).mockResolvedValue({ allowed: false, deniedFields: [] });

    const error = await handler.handle(payload, input(), {}).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/permission|not allowed|access/iu);
  });

  it("writes when the permission check allows", async () => {
    await handler.handle(payload, input(), {});

    expect(payload.update).toHaveBeenCalled();
  });

  it("asks about the document it is about to write, with the caller's identity", async () => {
    await handler.handle(payload, input(), { userId: "anna", userCollection: "users" });

    expect(await permission()).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        id: "doc-123",
        scope: expect.objectContaining({ userId: "anna" }),
      })
    );
  });

  // R2: a field the caller may not write is dropped from the payload, not a reason to refuse the rest.
  it("drops a denied field and still writes its siblings", async () => {
    (await permission()).mockResolvedValue({ allowed: true, deniedFields: ["title"] });

    await handler.handle(payload, input(), {});

    const [args] = (payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(args.data).not.toHaveProperty("title");
    expect(args.data).toHaveProperty("body", "Text");
  });

  // Every field denied is the same outcome as the collection refusing: nothing to write.
  it("refuses when every field is denied", async () => {
    (await permission()).mockResolvedValue({ allowed: true, deniedFields: ["title", "body"] });

    const error = await handler.handle(payload, input(), {}).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect(payload.update).not.toHaveBeenCalled();
  });

  // The publish is the one write that still happens when the pipeline produced nothing to save, so
  // it is worth pinning that it does — and that a collection-level refusal stops it, which is the
  // only thing that can.
  it("still publishes a locale the pipeline left alone", async () => {
    (await pipeline()).mockResolvedValue(null);

    await handler.handle(payload, input({ publishOnTranslation: true }), {});

    const [args] = (payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(args.data).toHaveProperty("_status");
  });

  it("does not publish when the collection refuses the update", async () => {
    (await pipeline()).mockResolvedValue(null);
    (await permission()).mockResolvedValue({ allowed: false, deniedFields: [] });

    await handler.handle(payload, input({ publishOnTranslation: true }), {}).catch(() => undefined);

    expect(payload.update).not.toHaveBeenCalled();
  });
});
