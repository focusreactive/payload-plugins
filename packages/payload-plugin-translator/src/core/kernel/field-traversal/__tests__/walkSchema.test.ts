import { describe, expect, it } from "vitest";

import type { FieldLike } from "../types.js";
import { ARRAY_ELEMENT, blockElement, inlineBlocks, walkSchema } from "../walkSchema.js";

const visitsOf = (fields: FieldLike[]): string[] => {
  const seen: string[] = [];
  walkSchema(fields, {
    blocksOf: inlineBlocks,
    visit: (node) => seen.push(`${node.kind} ${node.path.join(".")}`),
  });
  return seen;
};

const text = (name: string): FieldLike => ({ name, type: "text" });

describe("a walk of the schema alone", () => {
  it("visits a leaf at the path its name gives", () => {
    expect(visitsOf([text("title")])).toStrictEqual(["leaf title"]);
  });

  it("visits a group, then what it holds, one level down", () => {
    const fields: FieldLike[] = [{ name: "seo", type: "group", fields: [text("title")] }];

    expect(visitsOf(fields)).toStrictEqual(["group seo", "leaf seo.title"]);
  });

  it("flattens a container that opens no data boundary, and says nothing of a ui field", () => {
    const fields: FieldLike[] = [
      { type: "row", fields: [text("slug")] },
      { type: "ui", name: "spacer" },
    ];

    expect(visitsOf(fields)).toStrictEqual(["leaf slug"]);
  });

  it("opens a named tab and flattens an unnamed one", () => {
    const fields: FieldLike[] = [
      {
        type: "tabs",
        tabs: [{ name: "content", fields: [text("lead")] }, { fields: [text("aside")] }],
      },
    ];

    expect(visitsOf(fields)).toStrictEqual(["tab content", "leaf content.lead", "leaf aside"]);
  });

  it("visits an array, the one shape its elements share, and the fields of that shape", () => {
    const fields: FieldLike[] = [{ name: "features", type: "array", fields: [text("caption")] }];

    expect(visitsOf(fields)).toStrictEqual([
      "list features",
      `element features.${ARRAY_ELEMENT}`,
      `leaf features.${ARRAY_ELEMENT}.caption`,
    ]);
  });

  it("visits a blocks list once and each block's shape in turn", () => {
    const fields: FieldLike[] = [
      {
        name: "sections",
        type: "blocks",
        blocks: [
          { slug: "hero", fields: [text("heading")] },
          { slug: "quote", fields: [text("saying")] },
        ],
      },
    ];

    expect(visitsOf(fields)).toStrictEqual([
      "list sections",
      `element sections.${blockElement("hero")}`,
      `leaf sections.${blockElement("hero")}.heading`,
      `element sections.${blockElement("quote")}`,
      `leaf sections.${blockElement("quote")}.saying`,
    ]);
  });

  it("hands each node the field it came from, and a block element its block", () => {
    const hero = { slug: "hero", fields: [text("heading")] };
    const fields: FieldLike[] = [{ name: "sections", type: "blocks", blocks: [hero] }];
    const elements: unknown[] = [];

    walkSchema(fields, {
      blocksOf: inlineBlocks,
      visit: (node) => {
        if (node.kind === "element") elements.push(node.block);
      },
    });

    expect(elements).toStrictEqual([hero]);
  });

  it("asks the caller which blocks a list offers, rather than reading them itself", () => {
    const quote = { slug: "quote", fields: [text("saying")] };
    const fields: FieldLike[] = [{ name: "sections", type: "blocks", blockReferences: ["quote"] }];
    const seen: string[] = [];

    walkSchema(fields, {
      blocksOf: () => [quote],
      visit: (node) => seen.push(`${node.kind} ${node.path.join(".")}`),
    });

    expect(seen).toStrictEqual([
      "list sections",
      `element sections.${blockElement("quote")}`,
      `leaf sections.${blockElement("quote")}.saying`,
    ]);
  });
});

describe("a block that contains itself", () => {
  const selfReferencing = (): FieldLike[] => {
    const inner: FieldLike = { name: "inner", type: "blocks", blocks: [] };
    const card = { slug: "card", fields: [text("title"), inner] };
    inner.blocks = [card];
    return [{ name: "sections", type: "blocks", blocks: [card] }];
  };

  it("terminates, visiting the shape once on the branch it is already inside", () => {
    const seen = visitsOf(selfReferencing());

    expect(seen).toStrictEqual([
      "list sections",
      `element sections.${blockElement("card")}`,
      `leaf sections.${blockElement("card")}.title`,
      `list sections.${blockElement("card")}.inner`,
    ]);
  });

  it("walks a different block that happens to reuse the slug, since it is another shape", () => {
    const deep: FieldLike = { name: "deep", type: "text" };
    const inner = { slug: "card", fields: [deep] };
    const outer = {
      slug: "card",
      fields: [text("title"), { name: "nested", type: "blocks", blocks: [inner] } as FieldLike],
    };

    const seen = visitsOf([{ name: "sections", type: "blocks", blocks: [outer] }]);

    expect(seen).toContain(
      `leaf sections.${blockElement("card")}.nested.${blockElement("card")}.deep`
    );
  });

  it("walks the same shape again on a branch it has left", () => {
    const card = { slug: "card", fields: [text("title")] };
    const fields: FieldLike[] = [
      { name: "top", type: "blocks", blocks: [card] },
      { name: "bottom", type: "blocks", blocks: [card] },
    ];

    expect(visitsOf(fields).filter((v) => v.startsWith("leaf"))).toStrictEqual([
      `leaf top.${blockElement("card")}.title`,
      `leaf bottom.${blockElement("card")}.title`,
    ]);
  });
});
