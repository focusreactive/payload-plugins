import { describe, expect, it } from "vitest";

import type { ConfiguredField } from "../collectionPresentation.js";
import { collectionPresentation } from "../collectionPresentation.js";
import { documentTree } from "../documentTree.js";

const text = (name: string, over: Partial<ConfiguredField> = {}): ConfiguredField => ({
  name,
  type: "text",
  localized: true,
  ...over,
});

/** The config side and the schema side of one collection, as the two readers see them. */
const of = (fields: ConfiguredField[], document: Record<string, unknown>) =>
  documentTree({
    document,
    schema: fields,
    presentation: collectionPresentation({ fields }),
  });

describe("the document's translatable shape", () => {
  it("names each leaf by its label, with the config's required flag", () => {
    const fields = [text("title", { required: true }), text("summary")];

    expect(of(fields, { title: "Hello", summary: "Short" })).toStrictEqual([
      { kind: "leaf", label: "Title", address: "title", required: true },
      { kind: "leaf", label: "Summary", address: "summary", required: false },
    ]);
  });

  it("leaves out a leaf the source has no text for, so the tree matches what a run can do", () => {
    const fields = [text("title"), text("summary")];

    expect(of(fields, { title: "Hello", summary: "   " })).toStrictEqual([
      { kind: "leaf", label: "Title", address: "title", required: false },
    ]);
  });

  it("leaves out a leaf the read never produced, as with a field the caller may not see", () => {
    const fields = [text("title"), text("secret")];

    expect(of(fields, { title: "Hello" })).toStrictEqual([
      { kind: "leaf", label: "Title", address: "title", required: false },
    ]);
  });

  it("nests a group's leaves under the group, and drops a group left with none", () => {
    const fields: ConfiguredField[] = [
      { name: "seo", type: "group", localized: true, fields: [text("title")] },
      { name: "legal", type: "group", localized: true, fields: [text("notice")] },
    ];

    expect(of(fields, { seo: { title: "Page" }, legal: { notice: "" } })).toStrictEqual([
      {
        kind: "group",
        label: "Seo",
        children: [{ kind: "leaf", label: "Title", address: "seo.title", required: false }],
      },
    ]);
  });

  it("numbers the elements of an array under the element's singular", () => {
    const fields: ConfiguredField[] = [
      {
        name: "features",
        type: "array",
        labels: { singular: "Feature" },
        fields: [text("title")],
      },
    ];
    const document = {
      features: [
        { id: "f1", title: "One" },
        { id: "f2", title: "Two" },
      ],
    };

    expect(of(fields, document)).toStrictEqual([
      {
        kind: "group",
        label: "Features",
        children: [
          {
            kind: "group",
            label: "Feature 1",
            children: [
              { kind: "leaf", label: "Title", address: "features.f1.title", required: false },
            ],
          },
          {
            kind: "group",
            label: "Feature 2",
            children: [
              { kind: "leaf", label: "Title", address: "features.f2.title", required: false },
            ],
          },
        ],
      },
    ]);
  });

  it("labels a block element by its block, numbered within the list", () => {
    const fields: ConfiguredField[] = [
      {
        name: "sections",
        type: "blocks",
        blocks: [
          { slug: "hero", fields: [text("heading")] },
          { slug: "text", fields: [text("body")] },
        ],
      },
    ];
    const document = {
      sections: [
        { id: "b1", blockType: "hero", heading: "Big" },
        { id: "b2", blockType: "text", body: "Words" },
      ],
    };

    expect(of(fields, document)).toStrictEqual([
      {
        kind: "group",
        label: "Sections",
        children: [
          {
            kind: "group",
            label: "Hero 1",
            children: [
              {
                kind: "leaf",
                label: "Heading",
                address: "sections.b1:hero.heading",
                required: false,
              },
            ],
          },
          {
            kind: "group",
            label: "Text 2",
            children: [
              { kind: "leaf", label: "Body", address: "sections.b2:text.body", required: false },
            ],
          },
        ],
      },
    ]);
  });

  it("makes one whole-list node of a list localized as a whole, carrying every address under it", () => {
    const fields: ConfiguredField[] = [
      {
        name: "sidebar",
        type: "blocks",
        localized: true,
        blocks: [{ slug: "note", fields: [text("text"), text("footnote")] }],
      },
    ];
    const document = {
      sidebar: [
        { id: "s1", blockType: "note", text: "One", footnote: "a" },
        { id: "s2", blockType: "note", text: "Two", footnote: "" },
      ],
    };

    expect(of(fields, document)).toStrictEqual([
      {
        kind: "whole-list",
        label: "Sidebar",
        addresses: ["sidebar.s1:note.text", "sidebar.s1:note.footnote", "sidebar.s2:note.text"],
      },
    ]);
  });

  it("answers nothing for a document with no translatable text", () => {
    expect(of([text("title")], { title: "" })).toStrictEqual([]);
  });
});
