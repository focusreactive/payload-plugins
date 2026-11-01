import { describe, expect, it } from "vitest";

import type { BlockLike, BlockSlug, FieldLike } from "./types.js";
import { projectFieldsToFieldLike } from "./projectFieldLike.js";

const sectionsByReference = (blockReferences: (BlockLike | BlockSlug)[]): FieldLike => ({
  type: "blocks",
  name: "sections",
  blocks: [],
  blockReferences,
});

const hero: BlockLike = {
  slug: "hero",
  fields: [{ type: "text", name: "heading", localized: true }],
};

describe("projectFieldsToFieldLike — blockReferences", () => {
  it("resolves a slug against the shared blocks", () => {
    const [sections] = projectFieldsToFieldLike([sectionsByReference(["hero"])], [hero]);

    expect(sections).toEqual({
      type: "blocks",
      name: "sections",
      blocks: [{ slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] }],
    });
  });

  it("projects a Block object given inline in blockReferences", () => {
    const [sections] = projectFieldsToFieldLike([
      sectionsByReference([{ slug: "cta", fields: [{ type: "text", name: "label" }] }]),
    ]);

    expect(sections.blocks).toEqual([{ slug: "cta", fields: [{ type: "text", name: "label" }] }]);
  });

  it("drops a slug no shared block defines, keeping the ones it can resolve", () => {
    const [sections] = projectFieldsToFieldLike([sectionsByReference(["ghost", "hero"])], [hero]);

    expect(sections.blocks?.map((block) => block.slug)).toEqual(["hero"]);
  });

  it("projects a block that references itself without recursing forever", () => {
    const section: BlockLike = {
      slug: "section",
      fields: [
        { type: "text", name: "title", localized: true },
        { type: "blocks", name: "children", blocks: [], blockReferences: ["section"] },
      ],
    };

    const [sections] = projectFieldsToFieldLike([sectionsByReference(["section"])], [section]);

    const projected = sections.blocks?.[0];
    expect(projected?.fields[0]).toEqual({ type: "text", name: "title", localized: true });
    expect(projected?.fields[1].blocks?.[0]).toBe(projected);
  });

  it("is independent of the shared block's source (sanitize's delete localized)", () => {
    const source = structuredClone(hero);

    const [sections] = projectFieldsToFieldLike([sectionsByReference(["hero"])], [source]);
    delete source.fields[0].localized;

    expect(sections.blocks?.[0].fields[0].localized).toBe(true);
  });
});
