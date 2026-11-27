import { describe, expect, it } from "vitest";

import type { FieldLike } from "../../../kernel/field-traversal/types.js";
import { translationLanguages } from "../../../../server/features/_lib/translationLanguages.js";
import { translatableTextPresence } from "../holdsTranslatableText.js";

const localizedText = (name: string): FieldLike => ({ name, type: "text", localized: true });

const DOCS: FieldLike[] = [
  localizedText("title"),
  localizedText("summary"),
  { name: "body", type: "richText", localized: true },
  {
    name: "sections",
    type: "blocks",
    blocks: [{ slug: "hero", fields: [localizedText("heading"), localizedText("subheading")] }],
  },
];

const schemas = { get: (collection: string) => (collection === "docs" ? DOCS : undefined) };
const holdsText = translatableTextPresence(schemas, translationLanguages());

describe("whether a document holds text a run would translate", () => {
  it("answers no for a collection this plugin does not translate", () => {
    expect(holdsText("unknown", { title: "Something" })).toBe(false);
  });

  it("answers no for a document with nothing in it", () => {
    expect(holdsText("docs", {})).toBe(false);
  });

  it("answers yes for one top-level field holding text", () => {
    expect(holdsText("docs", { title: "A title" })).toBe(true);
  });

  it("answers no when every field is an empty string", () => {
    expect(holdsText("docs", { title: "", summary: "" })).toBe(false);
  });

  it("answers no when a field holds whitespace alone", () => {
    expect(holdsText("docs", { title: "   ", summary: "\n\t" })).toBe(false);
  });

  it("answers yes when only a field inside a block holds text", () => {
    expect(
      holdsText("docs", {
        title: "",
        sections: [{ id: "a", blockType: "hero", heading: "", subheading: "Deep" }],
      })
    ).toBe(true);
  });

  it("answers no when a block exists but holds no text", () => {
    expect(
      holdsText("docs", {
        sections: [{ id: "a", blockType: "hero", heading: "", subheading: "  " }],
      })
    ).toBe(false);
  });

  it("answers no for a rich text field with no text nodes", () => {
    expect(holdsText("docs", { body: { root: { type: "root", children: [] } } })).toBe(false);
  });

  it("answers yes for a rich text field that holds words", () => {
    expect(
      holdsText("docs", {
        body: {
          root: {
            type: "root",
            children: [{ type: "paragraph", children: [{ type: "text", text: "Hello" }] }],
          },
        },
      })
    ).toBe(true);
  });
});
