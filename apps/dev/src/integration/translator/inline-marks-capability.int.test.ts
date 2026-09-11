import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildNestedCollections } from "./nestedCollections";
import { callEndpoint } from "./callEndpoint";

/**
 * The flag is on, the provider never declared it can keep marks.
 *
 * This is the gate that matters in production: a translation service that is not a language model
 * would translate or strip `<1>`, so the core must keep translating node by node whatever the
 * plugin config asks for. The evidence is the word order — per-node translation cannot change it,
 * and the fake reverses marks it never receives.
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

describe("the flag on, the provider silent about marks", () => {
  let ctx: TestPayload;
  let de: Record<string, unknown>;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      inlineMarks: true,
      declareCapability: false,
      collections: buildNestedCollections(),
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

  it("translates node by node, so the order is the source's", () => {
    expect(textsOf(de.body)).toEqual(["de:one ", "de:two", "de: three"]);
  });

  it("translates the plain leaf as usual", () => {
    expect(de.summary).toBe("de:Plain summary");
  });
});
