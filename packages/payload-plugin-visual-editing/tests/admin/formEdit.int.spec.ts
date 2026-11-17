import type { Field, FormState } from "payload";

import { describe, expect, it } from "vitest";

import { formEditOf } from "../../src/admin/inlineEditing/formEdit";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { VE_FIELD_EDIT_TYPE } from "../../src/shared/protocol";

const editableSchema = buildEditableSchema([
  { name: "title", type: "text" },
  { name: "summary", type: "textarea" },
  { name: "body", type: "richText" },
  { name: "secret", type: "text", hidden: true },
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

describe("formEditOf", () => {
  it("names the form path and the value of an edit of the open document", () => {
    expect(formEditOf(edit(), openForm)).toEqual({ path: "title", value: "New title" });
  });

  it("finds the row of a block by its id, wherever the row is now", () => {
    const moved = edit({ key: "layout.row-b.heading", value: "Changed" });

    expect(formEditOf(moved, openForm)).toEqual({ path: "layout.1.heading", value: "Changed" });
  });

  it("joins the lines of a single-line field and keeps those of a textarea", () => {
    expect(formEditOf(edit({ value: "One\nTwo" }), openForm)?.value).toBe("One Two");
    expect(formEditOf(edit({ key: "summary", value: "One\nTwo" }), openForm)?.value).toBe(
      "One\nTwo"
    );
  });

  it("takes an edit that names no locale", () => {
    expect(formEditOf(edit({ locale: undefined }), openForm)).not.toBeNull();
  });

  it.each([
    ["another document", { docId: "8" }],
    ["another collection", { collectionSlug: "post" }],
    ["another locale", { locale: "de" }],
    ["a rich text field", { key: "body" }],
    ["a hidden field", { key: "secret" }],
    ["a field the form does not have", { key: "missing" }],
    ["a row that is gone", { key: "layout.row-z.heading" }],
    ["a list", { key: "layout" }],
    ["a value that is not text", { value: 3 }],
    ["another message", { type: "ve:open-field" }],
  ])("writes nothing for %s", (_name, overrides) => {
    expect(formEditOf(edit(overrides), openForm)).toBeNull();
  });

  it("writes nothing for a message that is no object", () => {
    expect(formEditOf("ve:field-edit", openForm)).toBeNull();
  });
});
