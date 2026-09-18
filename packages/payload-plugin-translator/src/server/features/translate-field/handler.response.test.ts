import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CollectionSlug, Field, PayloadRequest } from "payload";

import type { TranslationProvider } from "../../../core/domain/translation-providers";
import { TranslateFieldHandler } from "./handler";
import type { FieldTranslationConfig } from "./model";

vi.mock("../../../core/translation-pipeline", () => ({
  translateContent: vi.fn().mockResolvedValue(null),
}));

const f = (config: Record<string, unknown>): Field => config as unknown as Field;

const LOCALIZATION = { defaultLocale: "en", locales: ["en", "de"] };

const reqWith = (body: Record<string, unknown>, doc: unknown): PayloadRequest =>
  ({
    json: () => Promise.resolve(body),
    payload: {
      findByID: vi.fn().mockResolvedValue(doc),
      config: { localization: LOCALIZATION },
    },
  }) as unknown as PayloadRequest;

const baseBody = {
  collection_slug: "posts",
  field_path: "title",
  target_lng: "de",
  source_lng: "en",
  doc_id: "p1",
};

let handler: TranslateFieldHandler;

beforeEach(() => {
  vi.clearAllMocks();
  const provider: TranslationProvider = { translate: vi.fn() };
  const schemaMap = new Map([
    [
      "posts" as CollectionSlug,
      [
        f({ name: "title", type: "text", localized: true }),
        f({ name: "count", type: "number" }),
        f({
          name: "meta",
          type: "group",
          fields: [f({ name: "subtitle", type: "text", localized: true })],
        }),
      ],
    ],
  ]);
  handler = new TranslateFieldHandler({
    translationProvider: provider,
    schemaMap,
  } as unknown as FieldTranslationConfig);
});

const bodyOf = async (req: PayloadRequest) => {
  const res = await handler.handle(req);
  return { status: res.status, data: ((await res.json()) as { data: unknown }).data };
};

// The saved value is read with `draft: true` through the Local API, so a refusal that echoes it hands
// back unpublished content that the collection's own rules never got to gate. Nothing consumes it:
// the field control reads `value` only on the `translated` branch.
describe("POST /field — a refusal returns no document content", () => {
  it("does not echo the stored value when the field is not translatable", async () => {
    const { data } = await bodyOf(
      reqWith({ ...baseBody, field_path: "count" }, { id: "p1", count: 42 })
    );

    expect(data).not.toHaveProperty("value");
    expect(data).toHaveProperty("notice");
  });

  it("does not echo a whole subtree when the path names a container", async () => {
    const secret = { subtitle: "unpublished draft copy" };
    const { data } = await bodyOf(
      reqWith({ ...baseBody, field_path: "meta" }, { id: "p1", meta: secret })
    );

    expect(JSON.stringify(data)).not.toContain("unpublished draft copy");
  });

  it("does not echo the stored value when there is nothing to translate", async () => {
    const { data } = await bodyOf(reqWith(baseBody, { id: "p1", title: "Hello" }));

    expect(data).not.toHaveProperty("value");
  });
});

// `source_lng` reaches `payload.findByID({ locale })` unvalidated on this endpoint.
describe("POST /field — the source locale is checked against the configured ones", () => {
  it("refuses a source locale the project does not have", async () => {
    const { status } = await bodyOf(
      reqWith({ ...baseBody, source_lng: "xx" }, { id: "p1", title: "Hello" })
    );

    expect(status).toBe(400);
  });

  it("refuses a target locale the project does not have", async () => {
    const { status } = await bodyOf(
      reqWith({ ...baseBody, target_lng: "zz" }, { id: "p1", title: "Hello" })
    );

    expect(status).toBe(400);
  });

  it("still accepts a configured pair", async () => {
    const { status } = await bodyOf(reqWith(baseBody, { id: "p1", title: "Hello" }));

    expect(status).toBe(200);
  });
});
