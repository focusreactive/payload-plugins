import type { Field } from "payload";

import { describe, expect, it } from "vitest";

import {
  buildEditableSchema,
  textFieldTypeAt,
} from "../../src/shared/editableSchema/editableSchema";
import { editedTextOf, readFieldEdit } from "../../src/shared/fieldEdit";
import { withMarker } from "../../src/shared/stegaText";

const schema = buildEditableSchema([
  { name: "title", type: "text" },
  { name: "summary", type: "textarea" },
  { name: "contact", type: "email" },
  { name: "body", type: "richText" },
  { name: "views", type: "number" },
  { name: "secret", type: "text", hidden: true },
  {
    name: "layout",
    type: "blocks",
    blocks: [{ slug: "hero", fields: [{ name: "heading", type: "text" }] }],
  },
] as Field[]);

describe("textFieldTypeAt", () => {
  it("names the type of a plain text field", () => {
    expect(textFieldTypeAt(schema, [{ name: "title" }])).toBe("text");
    expect(textFieldTypeAt(schema, [{ name: "summary" }])).toBe("textarea");
    expect(textFieldTypeAt(schema, [{ name: "contact" }])).toBe("email");
  });

  it("names the type of a text field of a block row", () => {
    const steps = [{ name: "layout" }, { blockType: "hero", rowId: "row-1" }, { name: "heading" }];

    expect(textFieldTypeAt(schema, steps)).toBe("text");
  });

  it("answers nothing for a field that is not plain text", () => {
    expect(textFieldTypeAt(schema, [{ name: "body" }])).toBeNull();
    expect(textFieldTypeAt(schema, [{ name: "views" }])).toBeNull();
    expect(textFieldTypeAt(schema, [{ name: "layout" }])).toBeNull();
  });

  it("answers nothing for a field the editor cannot reach", () => {
    expect(textFieldTypeAt(schema, [{ name: "secret" }])).toBeNull();
    expect(textFieldTypeAt(schema, [{ name: "missing" }])).toBeNull();
    expect(textFieldTypeAt(schema, [{ name: "title" }, { name: "nested" }])).toBeNull();
  });
});

describe("editedTextOf", () => {
  it("keeps the line breaks of a textarea", () => {
    expect(editedTextOf("textarea", "One\nTwo")).toBe("One\nTwo");
  });

  it("joins the lines of a single-line field with a space", () => {
    expect(editedTextOf("text", "One \r\n Two\n\nThree")).toBe("One Two Three");
    expect(editedTextOf("email", "a@b.c\n")).toBe("a@b.c ");
  });

  it.each([
    ["a line separator", "\u2028"],
    ["a paragraph separator", "\u2029"],
    ["a next line", "\u0085"],
    ["a vertical tab, a soft break pasted from a word processor", "\v"],
    ["a form feed", "\f"],
  ])("joins the lines of a single-line field broken by %s", (_name, lineBreak) => {
    expect(editedTextOf("text", `One${lineBreak}Two`)).toBe("One Two");
  });

  it("drops a marker the page left in the text", () => {
    const marked = withMarker("Hello", { path: "title" });

    expect(editedTextOf("text", marked)).toBe("Hello");
  });
});

describe("readFieldEdit", () => {
  const edit = {
    collectionSlug: "pages",
    docId: "1",
    key: "title",
    kind: "collection",
    value: "A",
  };

  it("reads the document, the field and the value", () => {
    expect(readFieldEdit({ ...edit, locale: "en", type: "ve:field-edit", extra: 1 })).toEqual({
      ...edit,
      locale: "en",
    });
  });

  it("reads an edit of a global", () => {
    const global = { collectionSlug: "nav", key: "label", kind: "global", value: "" };

    expect(readFieldEdit(global)).toEqual(global);
  });

  it.each([
    ["no value", { ...edit, value: undefined }],
    ["a value that is not text", { ...edit, value: { root: {} } }],
    ["no key", { ...edit, key: 3 }],
    ["no document", { key: "title", value: "A" }],
    ["a locale that is not text", { ...edit, locale: 1 }],
    ["nothing", null],
  ])("answers nothing for an edit with %s", (_name, data) => {
    expect(readFieldEdit(data)).toBeNull();
  });
});
