import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { TranslateDocumentHandler } from "./handler";
import type { TranslationProvider } from "../../../core/domain/translation-providers";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TranslateDocumentInput } from "./model";

vi.mock("../../../core/translation-pipeline", () => ({
  translateContent: vi.fn().mockResolvedValue({ title: "Titel" }),
}));

vi.mock("../../shared/payload/translationPermission", () => ({
  checkTranslationPermission: vi.fn(),
  // The second ask, with the payload each write actually sends; allowed unless a case says otherwise.
  mayWrite: vi.fn().mockResolvedValue(true),
}));

const mocks = async () => ({
  translate: (await import("../../../core/translation-pipeline")).translateContent as ReturnType<
    typeof vi.fn
  >,
  permission: (await import("../../shared/payload/translationPermission"))
    .checkTranslationPermission as ReturnType<typeof vi.fn>,
});

// Payload decides retries from the job's attempt count; there is no per-error "final" flag. So the
// answer to "three retries against a rule that will not change" is not to suppress the retries but to
// ask before paying: a refusal then costs three cheap checks instead of three translations.
describe("TranslateDocumentHandler — a refusal costs nothing at the provider", () => {
  let handler: TranslateDocumentHandler;
  let payload: Payload;

  const input = (): TranslateDocumentInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    strategy: "overwrite",
    publishOnTranslation: false,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };
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
    const { translate } = await mocks();
    translate.mockResolvedValue({ title: "Titel" });
  });

  it("never calls the translation pipeline when the write is refused", async () => {
    const { translate, permission } = await mocks();
    permission.mockResolvedValue({ allowed: false });

    await handler.handle(payload, input(), {}).catch(() => undefined);

    expect(translate).not.toHaveBeenCalled();
  });

  it("still calls it when the write is allowed", async () => {
    const { translate, permission } = await mocks();
    permission.mockResolvedValue({ allowed: true });

    await handler.handle(payload, input(), {});

    expect(translate).toHaveBeenCalled();
  });

  it("asks before it translates, not after", async () => {
    const order: string[] = [];
    const { translate, permission } = await mocks();
    permission.mockImplementation(async () => {
      order.push("ask");
      return { allowed: true };
    });
    translate.mockImplementation(async () => {
      order.push("translate");
      return { title: "Titel" };
    });

    await handler.handle(payload, input(), {});

    expect(order).toEqual(["ask", "translate"]);
  });
});
