import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";
import type { TestPayload } from "./bootTestPayload";

/**
 * Container-granular rich-text translation, end to end: a real Payload, a real save, and the
 * document read back out of the database.
 *
 * The fake reverses mark order, which is what a language with different word order does and what
 * the marked format exists to survive. With the flag off the same reply cannot be produced at all —
 * each node is translated alone — so every assertion here fails, which is how these specs were
 * first run.
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

const linkTo = (url: string, children: unknown[]) => ({
  type: "link",
  fields: { url, linkType: "custom" },
  children,
  version: 3,
});

const paragraph = (children: unknown[]) => ({
  type: "paragraph",
  children,
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
});

const richText = (children: unknown[]) => ({
  root: {
    type: "root",
    children: [paragraph(children)],
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
  },
});

type Child = { type: string; text?: string; fields?: { url?: string }; children?: Child[] };

const childrenOf = (doc: Record<string, unknown>): Child[] =>
  ((doc.body as { root?: { children?: { children?: Child[] }[] } })?.root?.children?.[0]
    ?.children ?? []) as Child[];

const textsOf = (doc: Record<string, unknown>): (string | undefined)[] =>
  childrenOf(doc).map((c) => (c.type === "link" ? c.children?.[0]?.text : c.text));

describe("container-granular rich text, saved and read back", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({ inlineMarks: true });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  const translate = async (body: unknown) => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Marks source", body } as never,
    });
    const id = String((created as { id: string | number }).id);
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: true,
      },
    });
    return (await ctx.payload.findByID({
      collection: "docs" as "pages",
      id,
      locale: "de" as "en",
    })) as unknown as Record<string, unknown>;
  };

  it("rebuilds a paragraph in the order the reply came back", async () => {
    const de = await translate(richText([text("a "), text("red", 1), text(" car")]));

    expect(textsOf(de)).toEqual(["de: car", "de:red", "de:a "]);
  });

  it("carries a word's formatting with it when the word moves", async () => {
    const de = await translate(richText([text("a "), text("red", 1), text(" car")]));

    // Both halves: the order proves the reply moved things, the formats prove each one took its
    // own formatting along. Per-node translation keeps the source order, so this pair cannot pass
    // without the container path.
    expect(childrenOf(de).map((c) => [c.text, (c as { format?: number }).format])).toEqual([
      ["de: car", 0],
      ["de:red", 1],
      ["de:a ", 0],
    ]);
  });

  it("moves a link with its word, keeping the href", async () => {
    // The link sits first, so a reply that reorders has to put it last — a middle position would
    // look the same in both modes and prove nothing.
    const de = await translate(richText([linkTo("/docs", [text("manual")]), text(" first")]));
    const kinds = childrenOf(de).map((c) => c.type);
    const link = childrenOf(de).find((c) => c.type === "link");

    expect(kinds).toEqual(["text", "link"]);
    expect(link?.fields?.url).toBe("/docs");
    expect(link?.children?.[0]?.text).toBe("de:manual");
  });

  it("splits a wrapper that holds two differently formatted words, keeping both hrefs", async () => {
    const de = await translate(
      richText([
        text("See "),
        linkTo("/docs", [text("read the "), text("manual", 1)]),
        text(" now"),
      ])
    );
    const links = childrenOf(de).filter((c) => c.type === "link");

    // D12: one source wrapper becomes several adjacent wrappers, not merged back.
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.fields?.url)).toEqual(["/docs", "/docs"]);
  });

  it("does not split a wrapper again when the document is translated twice", async () => {
    const de = await translate(
      richText([
        text("See "),
        linkTo("/docs", [text("read the "), text("manual", 1)]),
        text(" now"),
      ])
    );
    expect(childrenOf(de).filter((c) => c.type === "link")).toHaveLength(2);

    const again = (await ctx.payload.findByID({
      collection: "docs" as "pages",
      id: String((de as { id: string | number }).id),
      locale: "de" as "en",
    })) as unknown as Record<string, unknown>;

    expect(childrenOf(again).filter((c) => c.type === "link")).toHaveLength(2);
  });
});
