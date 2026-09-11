import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildNestedCollections } from "./nestedCollections";
import { callEndpoint } from "./callEndpoint";

/**
 * What a document looks like after the model returns marks that cannot be parsed.
 *
 * The rule is all-or-nothing per container: a paragraph whose reply lost a mark keeps its **source**
 * text rather than being half rebuilt, because untranslated text is visible to an editor and a
 * half-rebuilt paragraph is not. Everything the reply did not damage still translates — the fake
 * only mangles values that carry marks, so plain fields come back normally.
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

describe("a reply whose marks cannot be parsed", () => {
  let ctx: TestPayload;
  let de: Record<string, unknown>;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      inlineMarks: true,
      collections: buildNestedCollections(),
      fake: { corrupt: "drop" },
    });

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

  it("leaves the container in its source language, whole", () => {
    expect(textsOf(de.body)).toEqual(["one ", "two", " three"]);
  });

  it("still translates what the damaged reply did not touch", () => {
    expect(de.summary).toBe("de:Plain summary");
  });
});
