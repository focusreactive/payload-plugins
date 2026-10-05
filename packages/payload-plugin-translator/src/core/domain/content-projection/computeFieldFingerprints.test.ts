import { describe, expect, it } from "vitest";

import type { FieldLike } from "../../kernel/field-traversal/types.js";

import { computeFieldFingerprints } from "./computeFieldFingerprints.js";

const schema: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  { name: "slug", type: "text" }, // not localized
  {
    name: "items",
    type: "array",
    fields: [{ name: "label", type: "text", localized: true }],
  },
];

const doc = {
  title: "The Title",
  slug: "the-title",
  items: [
    { id: "a1", label: "First" },
    { id: "b2", label: "Second" },
  ],
};

describe("computeFieldFingerprints", () => {
  it("emits one entry per translatable leaf, keyed by its id-based address", () => {
    expect(Object.keys(computeFieldFingerprints(doc, schema)).sort()).toEqual([
      "items.a1.label",
      "items.b2.label",
      "title",
    ]);
  });

  it("leaves out what the projection leaves out", () => {
    expect(computeFieldFingerprints(doc, schema)).not.toHaveProperty("slug");
  });

  it("gives a leaf the same hash for the same text, and a different one when the text changes", () => {
    const before = computeFieldFingerprints(doc, schema);
    const again = computeFieldFingerprints({ ...doc }, schema);
    const edited = computeFieldFingerprints({ ...doc, title: "Another Title" }, schema);

    expect(again.title).toBe(before.title);
    expect(edited.title).not.toBe(before.title);
  });

  it("does not move a sibling's hash when an element is inserted ahead of it", () => {
    const before = computeFieldFingerprints(doc, schema);
    const inserted = computeFieldFingerprints(
      { ...doc, items: [{ id: "z9", label: "Inserted" }, ...doc.items] },
      schema
    );

    expect(inserted["items.a1.label"]).toBe(before["items.a1.label"]);
    expect(inserted["items.b2.label"]).toBe(before["items.b2.label"]);
    expect(inserted["items.z9.label"]).toBeDefined();
  });

  it("drops the address of a leaf that is no longer in the document", () => {
    const withoutItems = computeFieldFingerprints({ title: "The Title" }, schema);
    expect(withoutItems).toEqual({ title: expect.any(String) });
  });

  it("returns an empty map for a document with nothing translatable", () => {
    expect(computeFieldFingerprints({ slug: "only-this" }, schema)).toEqual({});
  });
});
