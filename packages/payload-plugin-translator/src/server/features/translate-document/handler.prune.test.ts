import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { TranslateDocumentHandler } from "./handler";
import type { TranslationProvider } from "../../../core/domain/translation-providers";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TranslateDocumentInput } from "./model";

const TRANSLATED = {
  title: "Titel",
  meta: { subtitle: "Untertitel", headline: "Schlagzeile" },
  items: [
    { code: "a", label: "Eins" },
    { code: "b", label: "Zwei" },
  ],
};

vi.mock("../../../core/translation-pipeline", () => ({
  translateContent: vi.fn(),
}));

vi.mock("../../shared/payload/translationPermission", () => ({
  checkTranslationPermission: vi.fn(),
}));

const permission = async () =>
  (await import("../../shared/payload/translationPermission"))
    .checkTranslationPermission as ReturnType<typeof vi.fn>;

// A refused field is a reason to leave that field alone, never to abandon the locale. The siblings a
// rule allows must survive — including the siblings of a field nested in a group or an array row.
describe("TranslateDocumentHandler — what a refused field costs", () => {
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

  const written = () =>
    (
      (payload.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        data: Record<string, unknown>;
      }
    ).data;

  beforeEach(async () => {
    vi.clearAllMocks();
    (
      (await import("../../../core/translation-pipeline")).translateContent as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(structuredClone(TRANSLATED));

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
  });

  it("drops a refused leaf and keeps its sibling inside the same group", async () => {
    (await permission()).mockResolvedValue({
      allowed: true,
      deniedFields: ["meta.subtitle"],
      user: null,
    });

    await handler.handle(payload, input(), {});

    expect(written().meta).toEqual({ headline: "Schlagzeile" });
  });

  it("keeps the other top-level fields untouched", async () => {
    (await permission()).mockResolvedValue({
      allowed: true,
      deniedFields: ["meta.subtitle"],
      user: null,
    });

    await handler.handle(payload, input(), {});

    expect(written().title).toBe("Titel");
  });

  it("drops a refused leaf from every row of an array", async () => {
    (await permission()).mockResolvedValue({
      allowed: true,
      deniedFields: ["items.code"],
      user: null,
    });

    await handler.handle(payload, input(), {});

    expect(written().items).toEqual([{ label: "Eins" }, { label: "Zwei" }]);
  });

  it("still refuses the locale when everything was refused", async () => {
    (await permission()).mockResolvedValue({
      allowed: true,
      deniedFields: ["title", "meta", "items"],
      user: null,
    });

    await handler.handle(payload, input(), {}).catch(() => undefined);

    expect(payload.update).not.toHaveBeenCalled();
  });
});
