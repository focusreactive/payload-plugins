import { describe, expect, it } from "vitest";

import type { ConfiguredField } from "../collectionPresentation.js";
import { collectionPresentation } from "../collectionPresentation.js";

const localized = { localized: true } as const;

describe("what the collection's config says about a field", () => {
  it("takes a leaf's label and required flag as written", () => {
    const { at } = collectionPresentation({
      fields: [{ name: "title", type: "text", label: "Headline", required: true, ...localized }],
    });

    expect(at(["title"])).toStrictEqual({ label: "Headline", required: true });
  });

  it("humanizes the name where the config carries no label", () => {
    const { at } = collectionPresentation({
      fields: [{ name: "metaDescription", type: "text", ...localized }],
    });

    expect(at(["metaDescription"])).toStrictEqual({ label: "Meta Description", required: false });
  });

  it("reads a per-language label in the admin's language", () => {
    const fields = [{ name: "title", type: "text", label: { en: "Title", de: "Titel" } }];

    expect(collectionPresentation({ fields, language: "de" }).at(["title"])?.label).toBe("Titel");
  });

  it("falls back to English, then to the first entry, then to the name", () => {
    const fields = [
      { name: "title", type: "text", label: { en: "Title", de: "Titel" } },
      { name: "body", type: "text", label: { fr: "Corps" } },
      { name: "note", type: "text", label: {} },
    ];
    const { at } = collectionPresentation({ fields, language: "es" });

    expect([at(["title"])?.label, at(["body"])?.label, at(["note"])?.label]).toStrictEqual([
      "Title",
      "Corps",
      "Note",
    ]);
  });

  it("shows a label the config states as a function by the humanized name", () => {
    const fields = [{ name: "rowTitle", type: "text", label: () => "never asked" }];

    expect(collectionPresentation({ fields }).at(["rowTitle"])?.label).toBe("Row Title");
  });

  it("reads a leaf under a group, a named tab and a row at the path the data has", () => {
    const { at } = collectionPresentation({
      fields: [
        {
          name: "seo",
          type: "group",
          label: "Search",
          fields: [{ name: "title", type: "text", label: "Page title" }],
        },
        {
          type: "tabs",
          tabs: [
            { name: "content", label: "Content", fields: [{ name: "lead", type: "text" }] },
            { label: "Loose", fields: [{ name: "aside", type: "text" }] },
          ],
        },
        { type: "row", fields: [{ name: "slug", type: "text" }] },
      ],
    });

    expect(at(["seo"])?.label).toBe("Search");
    expect(at(["seo", "title"])?.label).toBe("Page title");
    expect(at(["content", "lead"])?.label).toBe("Lead");
    expect(at(["aside"])?.label).toBe("Aside");
    expect(at(["slug"])?.label).toBe("Slug");
  });

  it("labels one element of an array by the singular the config gives", () => {
    const { at } = collectionPresentation({
      fields: [
        {
          name: "features",
          type: "array",
          label: "Features",
          labels: { singular: "Feature", plural: "Features" },
          fields: [{ name: "title", type: "text" }],
        },
      ],
    });

    expect(at(["features"])?.label).toBe("Features");
    expect(at(["features", "#item"])?.label).toBe("Feature");
    expect(at(["features", "#item", "title"])?.label).toBe("Title");
  });

  it("labels one element of a blocks list by its block, inline or by reference", () => {
    const { at } = collectionPresentation({
      fields: [
        {
          name: "sections",
          type: "blocks",
          label: "Sections",
          blockReferences: ["hero"],
          blocks: [],
        },
        {
          name: "aside",
          type: "blocks",
          blocks: [
            {
              slug: "quote",
              labels: { singular: "Quote" },
              fields: [{ name: "text", type: "text" }],
            },
          ],
        },
      ],
      sharedBlocks: [
        { slug: "hero", labels: { singular: "Hero" }, fields: [{ name: "heading", type: "text" }] },
      ],
    });

    expect(at(["sections", "#hero"])?.label).toBe("Hero");
    expect(at(["sections", "#hero", "heading"])?.label).toBe("Heading");
    expect(at(["aside", "#quote"])?.label).toBe("Quote");
    expect(at(["aside", "#quote", "text"])?.label).toBe("Text");
  });

  it("answers nothing for a path the config does not have", () => {
    expect(collectionPresentation({ fields: [] }).at(["nowhere"])).toBeUndefined();
  });
});

describe("a block that contains itself", () => {
  it("is read to its own depth and no further, instead of running out of stack", () => {
    const inner: ConfiguredField = { name: "inner", type: "blocks", blocks: [] };
    const card = {
      slug: "card",
      labels: { singular: "Card" },
      fields: [{ name: "title", type: "text" }, inner],
    };
    inner.blocks = [card];

    const { at } = collectionPresentation({
      fields: [{ name: "sections", type: "blocks", label: "Sections", blocks: [card] }],
    });

    expect(at(["sections", "#card"])?.label).toBe("Card");
    expect(at(["sections", "#card", "title"])?.label).toBe("Title");
    expect(at(["sections", "#card", "inner"])?.label).toBe("Inner");
    expect(at(["sections", "#card", "inner", "#card"])).toBeUndefined();
  });
});
