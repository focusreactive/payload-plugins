import type { Field, FormState } from "payload";

import { describe, expect, it } from "vitest";

import { editOfDocument, formEditOf } from "../../src/admin/inlineEditing/formEdit";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { VE_FIELD_EDIT_TYPE } from "../../src/shared/protocol";

const editableSchema = buildEditableSchema([
  { name: "title", type: "text" },
  { name: "summary", type: "textarea" },
  { name: "body", type: "richText" },
  { name: "secret", type: "text", hidden: true },
  { hasMany: true, name: "tags", type: "text" },
  {
    name: "layout",
    type: "blocks",
    blocks: [{ slug: "hero", fields: [{ name: "heading", type: "text" }] }],
  },
] as Field[]);

const formState = {
  body: { value: { root: {} } },
  layout: {
    rows: [
      { blockType: "hero", id: "row-a" },
      { blockType: "hero", id: "row-b" },
    ],
  },
  "layout.0.heading": { value: "First" },
  "layout.1.heading": { value: "Second" },
  secret: { value: "Secret" },
  summary: { value: "Summary" },
  tags: { value: ["one", "two"] },
  title: { value: "Title" },
} as unknown as FormState;

const PAGE = { collectionSlug: "page", docId: "7", kind: "collection" } as const;

const openForm = { document: { ...PAGE, locale: "en" }, editableSchema, formState };

const edit = (overrides: Record<string, unknown> = {}) => ({
  ...PAGE,
  key: "title",
  type: VE_FIELD_EDIT_TYPE,
  value: "New title",
  ...overrides,
});

const written = (data: unknown) => {
  const edited = editOfDocument(data, openForm.document);
  return edited && formEditOf(edited, openForm);
};

describe("an edit of the preview page, written into the form", () => {
  it("names the form path and the value of an edit of the open document", () => {
    expect(written(edit({ locale: "en" }))).toEqual({ path: "title", value: "New title" });
  });

  it("finds the row of a block by its id, wherever the row is now", () => {
    const moved = edit({ key: "layout.row-b.heading", locale: "en", value: "Changed" });

    expect(written(moved)).toEqual({ path: "layout.1.heading", value: "Changed" });
  });

  it("joins the lines of a single-line field and keeps those of a textarea", () => {
    expect(written(edit({ locale: "en", value: "One\nTwo" }))?.value).toBe("One Two");
    expect(written(edit({ key: "summary", locale: "en", value: "One\nTwo" }))?.value).toBe(
      "One\nTwo"
    );
  });

  it("takes an edit without a locale when the admin has none", () => {
    const edited = editOfDocument(edit(), PAGE);

    expect(edited && formEditOf(edited, { ...openForm, document: PAGE })).not.toBeNull();
  });

  it.each([
    ["another locale", { locale: "de" }],
    ["no locale while the admin has one", {}],
    ["a rich text field", { key: "body", locale: "en" }],
    ["a hidden field", { key: "secret", locale: "en" }],
    ["a field the form does not have", { key: "missing", locale: "en" }],
    ["a row that is gone", { key: "layout.row-z.heading", locale: "en" }],
    ["a list", { key: "layout", locale: "en" }],
    ["a field that holds no text", { key: "tags", locale: "en" }],
  ])("writes nothing for %s", (_name, overrides) => {
    const edited = editOfDocument(edit(overrides), openForm.document);

    expect(edited).not.toBeNull();
    expect(edited && formEditOf(edited, openForm)).toBeNull();
  });

  it.each([
    ["another document", { docId: "8" }],
    ["another collection", { collectionSlug: "post" }],
    ["a value that is not text", { value: 3 }],
    ["another message", { type: "ve:open-field" }],
  ])("is not an edit of the open document for %s", (_name, overrides) => {
    expect(editOfDocument(edit(overrides), openForm.document)).toBeNull();
  });

  it("is not an edit when the message is no object", () => {
    expect(editOfDocument("ve:field-edit", openForm.document)).toBeNull();
  });
});
