import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Field, PayloadRequest } from "payload";

import type { TranslationProvider } from "../../../core/domain/translation-providers";

import { TranslateFieldHandler } from "./handler";
import type { FieldTranslationConfig, FieldTranslationInput } from "./model";
import { MAX_FIELD_VALUE_BYTES } from "./model";

// Isolate the handler's orchestration (read → resolve → translate → response mapping)
// from the pipeline itself.
vi.mock("../../../core/translation-pipeline", () => ({
  translateContent: vi.fn().mockResolvedValue(null),
}));

const f = (config: Record<string, unknown>): Field => config as unknown as Field;

// No `payload` — for requests that 400 before the DB read (validation / unknown collection).
const makeReq = (body: Partial<FieldTranslationInput> & Record<string, unknown>): PayloadRequest =>
  ({ json: () => Promise.resolve(body) }) as unknown as PayloadRequest;

// from-locale always reads the saved doc, so most requests need a `payload.findByID` mock.
const makeReqWithPayload = (
  body: Partial<FieldTranslationInput> & Record<string, unknown>,
  findByID: ReturnType<typeof vi.fn>
): PayloadRequest =>
  ({ json: () => Promise.resolve(body), payload: { findByID } }) as unknown as PayloadRequest;

// Valid from-locale request: translate `posts.title` from `en` into `de`, reading doc `p1`.
const baseBody = {
  collection_slug: "posts",
  field_path: "title",
  target_lng: "de",
  source_lng: "en",
  doc_id: "p1",
};

const reqWithDoc = (
  doc: unknown,
  overrides: Partial<FieldTranslationInput> & Record<string, unknown> = {}
): PayloadRequest =>
  makeReqWithPayload({ ...baseBody, ...overrides }, vi.fn().mockResolvedValue(doc));

let handler: TranslateFieldHandler;
let provider: TranslationProvider;

beforeEach(() => {
  vi.clearAllMocks();
  provider = { translate: vi.fn() };
  const schemaMap = new Map([
    [
      "posts" as CollectionSlug,
      [
        f({ name: "title", type: "text", localized: true }),
        f({ name: "count", type: "number" }),
        f({
          name: "layout",
          type: "blocks",
          blocks: [
            { slug: "hero", fields: [f({ name: "headline", type: "text", localized: true })] },
          ],
        }),
        f({
          name: "locLayout",
          type: "blocks",
          localized: true,
          blocks: [
            { slug: "hero", fields: [f({ name: "headline", type: "text", localized: true })] },
          ],
        }),
        f({
          name: "locItems",
          type: "array",
          localized: true,
          fields: [f({ name: "label", type: "text", localized: true })],
        }),
      ] as Field[],
    ],
  ]);
  const config: FieldTranslationConfig = { schemaMap, translationProvider: provider };
  handler = new TranslateFieldHandler(config);
});

const importTranslateContent = async () =>
  (await import("../../../core/translation-pipeline")).translateContent as unknown as ReturnType<
    typeof vi.fn
  >;

describe("TranslateFieldHandler", () => {
  it("reads the source-locale value from the saved doc and translates a localized leaf", async () => {
    (await importTranslateContent()).mockResolvedValue({ title: "Hallo" });
    const findByID = vi.fn().mockResolvedValue({ id: "p1", title: "Hello" });

    const res = await handler.handle(makeReqWithPayload(baseBody, findByID));

    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ status: "translated", value: "Hallo" });
    expect(findByID).toHaveBeenCalledWith({
      collection: "posts",
      id: "p1",
      locale: "en",
      fallbackLocale: false,
      depth: 0,
    });
    expect(await importTranslateContent()).toHaveBeenCalledWith(
      expect.objectContaining({ sourceData: { title: "Hello" }, sourceLng: "en", targetLng: "de" })
    );
  });

  it("returns a 200 noop+info when there is nothing to translate", async () => {
    (await importTranslateContent()).mockResolvedValue(null);

    const res = await handler.handle(reqWithDoc({ id: "p1", title: "Hello" }));
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.status).toBe("noop");
    expect(body.notice.level).toBe("info");
    expect(await importTranslateContent()).toHaveBeenCalledWith(
      expect.objectContaining({ sourceData: { title: "Hello" } })
    );
  });

  it("an empty source-locale value no-ops (translateContent gets undefined, returns null)", async () => {
    const translateContent = await importTranslateContent();
    (translateContent as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await handler.handle(reqWithDoc({ id: "p1" })); // no `title` in the source locale
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("noop");
    expect(translateContent).toHaveBeenCalledWith(
      expect.objectContaining({ sourceData: { title: undefined } })
    );
  });

  it("resolves a field inside a block via the saved doc's blockType and translates it", async () => {
    const translateContent = await importTranslateContent();
    (translateContent as ReturnType<typeof vi.fn>).mockResolvedValue({ headline: "Hallo" });

    const res = await handler.handle(
      reqWithDoc(
        { id: "p1", layout: [{ blockType: "hero", headline: "Hello" }] },
        { field_path: "layout.0.headline" }
      )
    );

    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ status: "translated", value: "Hallo" });
    expect(translateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: [{ name: "headline", type: "text", localized: true }],
        sourceData: { headline: "Hello" },
      })
    );
  });

  it("no-ops a block path the source doc can't resolve (unknown blockType — translateContent never called)", async () => {
    const translateContent = await importTranslateContent();

    const res = await handler.handle(
      reqWithDoc(
        { id: "p1", layout: [{ blockType: "ghost", headline: "x" }] },
        { field_path: "layout.0.headline" }
      )
    );
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.status).toBe("noop");
    expect(body.notice.level).toBe("info");
    expect(translateContent).not.toHaveBeenCalled();
  });

  it("no-ops with a warning for a field inside a localized blocks field (translateContent never called)", async () => {
    const translateContent = await importTranslateContent();

    const res = await handler.handle(
      reqWithDoc(
        { id: "p1", locLayout: [{ blockType: "hero", headline: "Hello" }] },
        { field_path: "locLayout.0.headline" }
      )
    );
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.status).toBe("noop");
    expect(body.notice.level).toBe("warning");
    expect(translateContent).not.toHaveBeenCalled();
  });

  it("no-ops with a warning for a field inside a localized array (translateContent never called)", async () => {
    const translateContent = await importTranslateContent();
    const res = await handler.handle(
      reqWithDoc({ id: "p1", locItems: [{ label: "Hello" }] }, { field_path: "locItems.0.label" })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.status).toBe("noop");
    expect(body.notice.level).toBe("warning");
    expect(translateContent).not.toHaveBeenCalled();
  });

  it("returns a 200 noop+info for a non-translatable field (translateContent never called)", async () => {
    const translateContent = await importTranslateContent();

    const res = await handler.handle(reqWithDoc({ id: "p1", count: 5 }, { field_path: "count" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.notice.level).toBe("info");
    expect(translateContent).not.toHaveBeenCalled();
  });

  it("413s when the source value is over the size cap (translateContent never called)", async () => {
    const translateContent = await importTranslateContent();

    const res = await handler.handle(
      reqWithDoc({ id: "p1", title: "x".repeat(MAX_FIELD_VALUE_BYTES + 1) })
    );
    expect(res.status).toBe(413);
    expect(translateContent).not.toHaveBeenCalled();
  });

  it("400s an unknown collection (before any DB read)", async () => {
    const res = await handler.handle(makeReq({ ...baseBody, collection_slug: "ghosts" }));
    expect(res.status).toBe(400);
  });

  it("400s a field path that resolves to no field (typo)", async () => {
    const res = await handler.handle(reqWithDoc({ id: "p1" }, { field_path: "nope" }));
    expect(res.status).toBe(400);
  });

  it("400s (validation) when doc_id is missing — DB never touched", async () => {
    const findByID = vi.fn();
    const res = await handler.handle(
      makeReqWithPayload({ ...baseBody, doc_id: undefined }, findByID)
    );
    expect(res.status).toBe(400);
    expect(findByID).not.toHaveBeenCalled();
  });

  it("400s (validation) when source_lng is empty — DB never touched", async () => {
    const findByID = vi.fn();
    const res = await handler.handle(makeReqWithPayload({ ...baseBody, source_lng: "" }, findByID));
    expect(res.status).toBe(400);
    expect(findByID).not.toHaveBeenCalled();
  });

  it("never forwards a translate strategy (field translation always overwrites)", async () => {
    const translateContent = await importTranslateContent();
    (translateContent as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "Hallo" });

    await handler.handle(reqWithDoc({ id: "p1", title: "Hello" }));

    const arg = (translateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg).toMatchObject({
      schema: [{ name: "title", type: "text", localized: true }],
      sourceData: { title: "Hello" },
      sourceLng: "en",
      targetLng: "de",
      translationProvider: provider,
    });
    expect(arg).not.toHaveProperty("strategy"); // not applicable to a single explicit field translate
    expect(arg).not.toHaveProperty("targetData");
  });
});
