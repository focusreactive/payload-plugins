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
}));

const permission = async () =>
  (await import("../../shared/payload/translationPermission"))
    .checkTranslationPermission as ReturnType<typeof vi.fn>;

const ANNA = { id: "anna", collection: "users" };

// Two paths, two answers. The deferred path runs on a request of its own, so Payload's own refusal
// costs only the translation and is worth having on top of the pre-check. The inline path carries the
// editor's transaction, and a refusal Payload raises there would roll their save back — which is the
// reason the pre-check exists in the first place.
describe("TranslateDocumentHandler — where Payload's own enforcement is affordable", () => {
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

  const writeArgs = () =>
    (payload.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;

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
    (await permission()).mockResolvedValue({ allowed: true, deniedFields: [], user: ANNA });
  });

  it("lets Payload check the deferred write as well", async () => {
    await handler.handle(payload, input(), { userId: "anna", userCollection: "users" });

    expect(writeArgs()).toMatchObject({ overrideAccess: false, user: ANNA });
  });

  it("leaves the inline write to the pre-check alone, so a refusal cannot kill the save", async () => {
    await handler.handle(payload, input(), {
      transactionID: "tx-1",
      userId: "anna",
      userCollection: "users",
    });

    expect(writeArgs()).not.toHaveProperty("overrideAccess");
    expect(writeArgs()).not.toHaveProperty("user");
  });

  it("adds nothing when the request named nobody", async () => {
    (await permission()).mockResolvedValue({ allowed: true, deniedFields: [], user: null });

    await handler.handle(payload, input(), {});

    expect(writeArgs()).not.toHaveProperty("overrideAccess");
  });
});
