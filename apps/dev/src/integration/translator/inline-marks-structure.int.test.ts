import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildNestedCollections } from "./nestedCollections";
import { callEndpoint } from "./callEndpoint";

/**
 * One rich-text value carrying every container shape a Lexical tree produces, translated and read
 * back from the database.
 *
 * A container is the nearest node holding at least one direct text child — a rule that names no
 * node types, and whose consequences are what this spec pins: a heading and a quote are containers
 * exactly as a paragraph is, **each list item is its own container** with its own marks numbered
 * from one, and a node carrying no text at all (a line break) still occupies a position the reply
 * may move it to.
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

const node = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  children,
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
  ...extra,
});

const listItem = (children: unknown[], value: number) =>
  node("listitem", children, { value, checked: undefined });

type Child = { type: string; text?: string; children?: Child[] };

const root = (children: unknown[]) => ({
  root: node("root", children) as unknown,
});

const childrenAt = (value: unknown, path: number[]): Child[] => {
  let current = (value as { root?: Child }).root as Child | undefined;
  for (const index of path) current = current?.children?.[index];
  return current?.children ?? [];
};

const textsAt = (value: unknown, path: number[]): (string | undefined)[] =>
  childrenAt(value, path).map((c) => c.text);

describe("every Lexical container shape, translated independently", () => {
  let ctx: TestPayload;
  let de: Record<string, unknown>;

  beforeAll(async () => {
    ctx = await bootTestPayload({ inlineMarks: true, collections: buildNestedCollections() });

    const body = root([
      node("heading", [text("chapter "), text("one", 1)], { tag: "h2" }),
      node(
        "list",
        [
          listItem([text("first "), text("item", 1)], 1),
          listItem([text("second "), text("item", 1)], 2),
        ],
        { listType: "bullet", start: 1, tag: "ul" }
      ),
      node("quote", [text("quoted "), text("words", 1)]),
      node("paragraph", [text("before "), { type: "linebreak", version: 1 }, text(" after")]),
    ]);

    const created = await ctx.payload.create({
      collection: "nested" as "pages",
      locale: "en",
      data: { body, summary: "S" } as never,
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
    })) as unknown as Record<string, unknown>;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("treats a heading as a container", () => {
    expect(textsAt(de.body, [0])).toEqual(["de:one", "de:chapter "]);
  });

  it("treats each list item as its own container, numbered from one", () => {
    // Independent numbering is the point: item two's marks restart, so a reply that reordered item
    // one cannot disturb item two.
    expect(textsAt(de.body, [1, 0])).toEqual(["de:item", "de:first "]);
    expect(textsAt(de.body, [1, 1])).toEqual(["de:item", "de:second "]);
  });

  it("treats a quote as a container", () => {
    expect(textsAt(de.body, [2])).toEqual(["de:words", "de:quoted "]);
  });

  it("moves a text-free node with the rest", () => {
    const kinds = childrenAt(de.body, [3]).map((c) => c.type);

    expect(kinds).toEqual(["text", "linebreak", "text"]);
    expect(textsAt(de.body, [3])).toEqual(["de: after", undefined, "de:before "]);
  });

  it("does not turn the list itself into a container", () => {
    // The list holds list items, not text, so it is walked past rather than translated as one
    // string — otherwise both items would share one numbering and could swap places.
    expect(childrenAt(de.body, [1]).map((c) => c.type)).toEqual(["listitem", "listitem"]);
  });
});
