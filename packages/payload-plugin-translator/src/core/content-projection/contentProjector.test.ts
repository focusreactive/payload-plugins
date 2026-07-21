import { describe, expect, it } from "vitest";

import { projectTranslatableContent } from "./contentProjector";
import type { FieldLike } from "../kernel/field-traversal/types";

const richText = (...texts: string[]) => ({
  root: {
    type: "root",
    children: texts.map((text) => ({
      type: "paragraph",
      children: [{ type: "text", text }],
    })),
  },
});

const localizedText = (name: string): FieldLike => ({
  name,
  type: "text",
  localized: true,
});

const sortByIdPath = (p: Array<{ idPath: string; text: string }>) =>
  [...p].sort((a, b) => a.idPath.localeCompare(b.idPath));

describe("projectTranslatableContent", () => {
  it("emits one entry per translatable, localized, non-excluded leaf", () => {
    const schema: FieldLike[] = [
      localizedText("title"),
      { name: "slug", type: "text" }, // not localized
      { name: "sku", type: "text", localized: true, custom: { translateKit: { exclude: true } } },
      { name: "count", type: "number", localized: true }, // not translatable type
    ];
    const doc = { title: "Hello", slug: "hello", sku: "ABC", count: 5 };

    const projection = projectTranslatableContent(doc, schema);

    expect(projection).toEqual([{ idPath: "title", text: "Hello" }]);
  });

  it("skips empty / whitespace-only text after trim", () => {
    const schema: FieldLike[] = [localizedText("a"), localizedText("b")];
    const doc = { a: "  ", b: "kept" };

    const projection = projectTranslatableContent(doc, schema);

    expect(projection).toEqual([{ idPath: "b", text: "kept" }]);
  });

  it("uses richText field-level granularity: one entry, joined node text", () => {
    const schema: FieldLike[] = [{ name: "body", type: "richText", localized: true }];
    const doc = { body: richText("First.", "Second.") };

    const projection = projectTranslatableContent(doc, schema);

    expect(projection).toHaveLength(1);
    expect(projection[0].idPath).toBe("body");
    expect(projection[0].text).toContain("First.");
    expect(projection[0].text).toContain("Second.");
  });

  it("skips an empty richText field", () => {
    const schema: FieldLike[] = [{ name: "body", type: "richText", localized: true }];
    const doc = { body: richText("   ") };

    expect(projectTranslatableContent(doc, schema)).toEqual([]);
  });

  it("descends into groups using the group name as a key segment", () => {
    const schema: FieldLike[] = [
      { name: "meta", type: "group", fields: [localizedText("heading")] },
    ];
    const doc = { meta: { heading: "Hi" } };

    expect(projectTranslatableContent(doc, schema)).toEqual([
      { idPath: "meta.heading", text: "Hi" },
    ]);
  });

  it("keys array/blocks elements by id, not index", () => {
    const schema: FieldLike[] = [
      {
        name: "content",
        type: "blocks",
        blocks: [{ slug: "hero", fields: [localizedText("heading")] }],
      },
    ];
    const doc = {
      content: [
        { id: "b1", blockType: "hero", heading: "One" },
        { id: "b2", blockType: "hero", heading: "Two" },
      ],
    };

    expect(projectTranslatableContent(doc, schema)).toEqual([
      { idPath: "content.b1:hero.heading", text: "One" },
      { idPath: "content.b2:hero.heading", text: "Two" },
    ]);
  });

  it("is reorder-invariant: reordering blocks yields the same set of {idPath,text}", () => {
    const schema: FieldLike[] = [
      {
        name: "content",
        type: "blocks",
        blocks: [{ slug: "hero", fields: [localizedText("heading")] }],
      },
    ];
    const ordered = {
      content: [
        { id: "b1", blockType: "hero", heading: "One" },
        { id: "b2", blockType: "hero", heading: "Two" },
      ],
    };
    const reordered = {
      content: [
        { id: "b2", blockType: "hero", heading: "Two" },
        { id: "b1", blockType: "hero", heading: "One" },
      ],
    };

    expect(sortByIdPath(projectTranslatableContent(ordered, schema))).toEqual(
      sortByIdPath(projectTranslatableContent(reordered, schema))
    );
  });

  it("handles nested arrays and blocks", () => {
    const schema: FieldLike[] = [
      {
        name: "sections",
        type: "array",
        fields: [
          localizedText("label"),
          {
            name: "items",
            type: "array",
            fields: [localizedText("text")],
          },
        ],
      },
    ];
    const doc = {
      sections: [
        {
          id: "s1",
          label: "L1",
          items: [{ id: "i1", text: "T1" }],
        },
      ],
    };

    expect(projectTranslatableContent(doc, schema)).toEqual([
      { idPath: "sections.s1.label", text: "L1" },
      { idPath: "sections.s1.items.i1.text", text: "T1" },
    ]);
  });

  it("does not mutate the input document", () => {
    const schema: FieldLike[] = [localizedText("title")];
    const doc = { title: "Hello" };
    const snapshot = JSON.parse(JSON.stringify(doc));

    projectTranslatableContent(doc, schema);

    expect(doc).toEqual(snapshot);
  });
});
