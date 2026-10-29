import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Field, PayloadRequest } from "payload";

import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";

import { TranslateFieldHandler } from "../handler.js";
import type { FieldTranslationConfig } from "../model.js";

vi.mock("../../../../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue({ translatedData: { title: "Titel" }, leaves: [] }),
}));

vi.mock("../../../shared/access/permission.js", () => ({
  mayInitiate: vi.fn(),
}));

const pipeline = async () =>
  (await import("../../../../core/translation-pipeline/index.js")).translateContent as ReturnType<
    typeof vi.fn
  >;

const askedAbout = async () =>
  (await import("../../../shared/access/permission.js")).mayInitiate as ReturnType<typeof vi.fn>;

const ANNA = { id: "anna", collection: "users" };

const field = (config: Record<string, unknown>): Field => config as unknown as Field;

describe("POST /field — it asks before it spends", () => {
  let handler: TranslateFieldHandler;
  let findByID: ReturnType<typeof vi.fn>;

  const request = (): PayloadRequest =>
    ({
      json: () =>
        Promise.resolve({
          collection_slug: "posts",
          field_path: "title",
          source_lng: "en",
          target_lng: "de",
          doc_id: "doc-123",
        }),
      user: ANNA,
      payload: {
        findByID,
        config: { localization: { defaultLocale: "en", locales: ["en", "de"] } },
      },
    }) as unknown as PayloadRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    findByID = vi.fn().mockResolvedValue({ id: "doc-123", title: "Saved title" });
    const translationProvider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };
    handler = new TranslateFieldHandler({
      schemaMap: new Map([
        ["posts" as CollectionSlug, [field({ name: "title", type: "text", localized: true })]],
      ]),
      translationProvider,
    } as unknown as FieldTranslationConfig);
    (await askedAbout()).mockResolvedValue(true);
  });

  it("refuses a caller the collection's rule would not let save", async () => {
    (await askedAbout()).mockResolvedValue(false);

    const response = await handler.handle(request());

    expect(response.status).toBe(403);
  });

  it("pays nothing for a caller it refuses", async () => {
    (await askedAbout()).mockResolvedValue(false);

    await handler.handle(request());

    expect(await pipeline()).not.toHaveBeenCalled();
    expect(findByID, "the source is not even read").not.toHaveBeenCalled();
  });

  it("asks about the document the request named, as the caller", async () => {
    await handler.handle(request());

    expect(await askedAbout()).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "posts", id: "doc-123", user: ANNA })
    );
  });

  it("translates for a caller the rule allows", async () => {
    const response = await handler.handle(request());

    expect(response.status).toBe(200);
    expect(await pipeline()).toHaveBeenCalled();
  });
});
