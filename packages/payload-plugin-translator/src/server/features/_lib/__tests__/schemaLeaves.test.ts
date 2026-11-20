import { describe, expect, it } from "vitest";

import type { FieldLike } from "../../../../core/kernel/field-traversal/index.js";
import { schemaLeaves, translatableFieldPaths } from "../schemaLeaves.js";

const text = (name: string, over: Partial<FieldLike> = {}): FieldLike => ({
  name,
  type: "text",
  localized: true,
  ...over,
});

const pathsOf = (schema: FieldLike[]): string[] =>
  schemaLeaves(schema).map((leaf) => leaf.path.join("."));

describe("every leaf a schema declares", () => {
  it("comes back in declaration order, whatever it holds", () => {
    const schema: FieldLike[] = [
      text("title"),
      { name: "seo", type: "group", fields: [text("description")] },
      { type: "row", fields: [text("slug")] },
    ];

    expect(pathsOf(schema)).toStrictEqual(["title", "seo.description", "slug"]);
  });

  it("names a leaf under a list by the shape it sits in", () => {
    const schema: FieldLike[] = [
      { name: "features", type: "array", fields: [text("caption")] },
      {
        name: "sections",
        type: "blocks",
        blocks: [{ slug: "hero", fields: [text("heading")] }],
      },
    ];

    expect(pathsOf(schema)).toStrictEqual(["features.#item.caption", "sections.#hero.heading"]);
  });

  it("reads the blocks a list carries inline, which is the shape the snapshot has", () => {
    const schema: FieldLike[] = [
      {
        name: "sections",
        type: "blocks",
        blocks: [
          { slug: "hero", fields: [text("heading")] },
          { slug: "quote", fields: [text("saying")] },
        ],
      },
    ];

    expect(pathsOf(schema)).toStrictEqual(["sections.#hero.heading", "sections.#quote.saying"]);
  });

  it("terminates on a block that contains itself, instead of running out of stack", () => {
    const inner: FieldLike = { name: "inner", type: "blocks", blocks: [] };
    const card = { slug: "card", fields: [text("title"), inner] };
    inner.blocks = [card];

    expect(pathsOf([{ name: "sections", type: "blocks", blocks: [card] }])).toStrictEqual([
      "sections.#card.title",
    ]);
  });
});

describe("the paths a query names to ask what a locale holds", () => {
  it("leaves the shapes out, since a stored field path has none", () => {
    const schema: FieldLike[] = [
      text("title"),
      { name: "features", type: "array", fields: [text("caption")] },
    ];

    expect(translatableFieldPaths(schema)).toStrictEqual(["title", "features.caption"]);
  });

  it("names a path once where two blocks declare the same field", () => {
    const schema: FieldLike[] = [
      {
        name: "sections",
        type: "blocks",
        blocks: [
          { slug: "hero", fields: [text("heading")] },
          { slug: "banner", fields: [text("heading")] },
        ],
      },
    ];

    expect(translatableFieldPaths(schema)).toStrictEqual(["sections.heading"]);
  });

  it("leaves out a leaf no run would translate", () => {
    const schema: FieldLike[] = [
      text("title"),
      { name: "views", type: "number", localized: true },
      text("sku", { localized: false }),
      text("slug", { custom: { translateKit: { exclude: true } } }),
    ];

    expect(translatableFieldPaths(schema)).toStrictEqual(["title"]);
  });
});
