import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildNestedCollections } from "./nestedCollections";
import { callEndpoint } from "./callEndpoint";

/**
 * Container-granular rich text under every nesting shape the field walker classifies, saved to a
 * real database and read back.
 *
 * The fake reverses mark order, so a translated paragraph reads back in the opposite order from its
 * source. That is the whole assertion: per-node translation cannot produce it, so each position
 * that reads back reordered is a position container mode actually reached.
 */

const text = (value: string, format = 0) => ({
  type: "text",
  text: value,
  format,
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

const paragraph = (children: unknown[]) => ({
  type: "paragraph",
  children,
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
});

/** Three leaves, so there is an order for the reply to change. */
const body = (a: string, b: string, c: string) => ({
  root: {
    type: "root",
    children: [paragraph([text(a), text(b, 1), text(c)])],
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
  },
});

type Child = { type: string; text?: string; format?: number; children?: Child[] };

const textsOf = (value: unknown): (string | undefined)[] =>
  (
    ((value as { root?: { children?: { children?: Child[] }[] } })?.root?.children?.[0]?.children ??
      []) as Child[]
  ).map((c) => c.text);

type Doc = Record<string, unknown>;
const at = (doc: Doc, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, key) => {
    const index = Number(key);
    return Number.isNaN(index)
      ? (acc as Record<string, unknown>)?.[key]
      : (acc as unknown[])?.[index];
  }, doc);

/** Every place the fixture puts a rich-text field, by the path it reads back at. */
const PLACES = [
  "body",
  "meta.body",
  "items.0.body",
  "sections.0.body",
  "seo.body",
  "looseBody",
  "rowBody",
  "collapsibleBody",
  "deep.rows.0.parts.0.body",
];

describe("container mode reaches rich text at every nesting depth", () => {
  let ctx: TestPayload;
  let de: Doc;
  let en: Doc;

  beforeAll(async () => {
    ctx = await bootTestPayload({ inlineMarks: true, collections: buildNestedCollections() });

    const created = await ctx.payload.create({
      collection: "nested" as "pages",
      locale: "en",
      data: {
        body: body("one ", "two", " three"),
        summary: "Plain summary",
        meta: { body: body("one ", "two", " three") },
        items: [{ body: body("one ", "two", " three"), code: "ITEM-KEEP" }],
        sections: [
          { blockType: "hero", body: body("one ", "two", " three"), anchor: "ANCHOR-KEEP" },
        ],
        seo: { body: body("one ", "two", " three") },
        looseBody: body("one ", "two", " three"),
        rowBody: body("one ", "two", " three"),
        collapsibleBody: body("one ", "two", " three"),
        deep: {
          rows: [
            {
              parts: [
                { blockType: "part", body: body("one ", "two", " three"), partRef: "PART-KEEP" },
              ],
            },
          ],
        },
      } as never,
    });
    const id = String((created as { id: string | number }).id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "nested",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: true,
      },
    });

    de = (await ctx.payload.findByID({
      collection: "nested" as "pages",
      id,
      locale: "de" as "en",
    })) as unknown as Doc;
    en = (await ctx.payload.findByID({
      collection: "nested" as "pages",
      id,
      locale: "en",
    })) as unknown as Doc;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  for (const path of PLACES) {
    it(`rebuilds the paragraph at ${path}`, () => {
      expect(textsOf(at(de, path))).toEqual(["de: three", "de:two", "de:one "]);
    });
  }

  it("translates the textarea leaf too", () => {
    expect(de.summary).toBe("de:Plain summary");
  });

  it("leaves the non-localized siblings of every shared row untouched", () => {
    expect(at(de, "items.0.code")).toBe("ITEM-KEEP");
    expect(at(de, "sections.0.anchor")).toBe("ANCHOR-KEEP");
    expect(at(de, "deep.rows.0.parts.0.partRef")).toBe("PART-KEEP");
  });

  it("leaves the source locale's own rich text alone", () => {
    for (const path of PLACES) {
      expect(textsOf(at(en, path)), path).toEqual(["one ", "two", " three"]);
    }
  });
});
