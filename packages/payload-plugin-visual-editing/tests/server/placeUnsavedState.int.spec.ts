import { describe, expect, it } from "vitest";

import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { placeUnsavedState } from "../../src/server/unsavedRichText/placeUnsavedState";

const UNSAVED = { root: { children: [], type: "root" } };
const STORED = { root: { children: [{ type: "paragraph" }], type: "root" } };

const schema = buildEditableSchema([
  { name: "title", type: "text" },
  { name: "body", type: "richText" },
  { localized: true, name: "localizedBody", type: "richText" },
  { fields: [{ name: "note", type: "richText" }], name: "list", type: "array" },
  {
    fields: [{ name: "note", type: "richText" }],
    localized: true,
    name: "localizedList",
    type: "array",
  },
  { fields: [{ name: "intro", type: "richText" }], name: "meta", type: "group" },
  {
    blocks: [
      { fields: [{ name: "body", type: "richText" }], slug: "hero" },
      { fields: [{ name: "body", type: "text" }], slug: "quote" },
    ],
    name: "layout",
    type: "blocks",
  },
]);

const storedDocument = () => ({
  body: STORED,
  layout: [
    { blockType: "quote", body: "Well said", id: "row-quote" },
    { blockType: "hero", body: STORED, id: "row-hero" },
  ],
  list: [
    { id: "row-a", note: STORED },
    { id: "row-b", note: STORED },
  ],
  localizedBody: { de: STORED, en: STORED },
  localizedList: { de: [{ id: "row-de", note: STORED }], en: [{ id: "row-en", note: STORED }] },
  meta: { intro: STORED },
  title: "Home",
});

const place = (fieldKey: string, locale?: string) => {
  const stored = storedDocument();
  const isPlaced = placeUnsavedState(stored, schema, { fieldKey, locale, state: UNSAVED });
  return { isPlaced, stored };
};

describe("placeUnsavedState", () => {
  it("replaces a field in a group", () => {
    const { isPlaced, stored } = place("meta.intro", "en");

    expect(isPlaced).toBe(true);
    expect(stored.meta.intro).toEqual(UNSAVED);
  });

  it("replaces the value of the read locale of a localized field", () => {
    const { stored } = place("localizedBody", "de");

    expect(stored.localizedBody).toEqual({ de: UNSAVED, en: STORED });
  });

  it.each([
    ["a field that is not rich text", "title", "en"],
    ["a field of a block that is not rich text", "layout.row-quote.body", "en"],
    ["a field the schema does not have", "summary", "en"],
    ["a row the document does not have", "list.row-c.note", "en"],
    ["a row of another locale", "localizedList.row-de.note", "en"],
    ["a localized field read without a locale", "localizedBody", undefined],
    ["a path that ends in a row", "list.row-a", "en"],
    ["a path through a field that holds no rows", "body.row-a.note", "en"],
  ])("leaves the document as it was for %s", (_name, fieldKey, locale) => {
    const { isPlaced, stored } = place(fieldKey, locale);

    expect(isPlaced).toBe(false);
    expect(stored).toEqual(storedDocument());
  });
});
