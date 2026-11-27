import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildNestedCollections } from "./nestedCollections";
import { callEndpoint } from "./callEndpoint";

/**
 * The fake reverses the marks it receives, and per-node translation cannot reorder words, so a
 * reversed order proves the paragraph travelled as one string.
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

const body = () => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [text("one "), text("two", 1), text(" three")],
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
      },
    ],
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
  },
});

type Child = { text?: string };
const textsOf = (value: unknown): (string | undefined)[] =>
  (
    ((value as { root?: { children?: { children?: Child[] }[] } })?.root?.children?.[0]?.children ??
      []) as Child[]
  ).map((c) => c.text);

describe("a formatted paragraph in a nested collection", () => {
  let ctx: TestPayload;
  let de: Record<string, unknown>;

  beforeAll(async () => {
    ctx = await bootTestPayload({ collections: buildNestedCollections() });

    const created = await ctx.payload.create({
      collection: "nested" as "pages",
      locale: "en",
      data: { body: body(), summary: "Plain summary" } as never,
    });
    const id = String((created as { id: string | number }).id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "nested",
        collection_id: [id],

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

  it("receives the paragraph whole, so the reply's order is the one stored", () => {
    expect(textsOf(de.body)).toEqual(["de: three", "de:two", "de:one "]);
  });

  it("translates the plain leaf as usual", () => {
    expect(de.summary).toBe("de:Plain summary");
  });
});
