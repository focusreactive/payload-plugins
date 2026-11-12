import { describe, expect, it } from "vitest";

import type { FieldLike } from "../../core/kernel/field-traversal/types.js";
import { fingerprintsOf } from "../../server/modules/provenance/__tests__/fixtures/fingerprinter.js";

const COLLECTION = "posts";

const fieldFingerprintsOf = (doc: Record<string, unknown>, schema: FieldLike[]) =>
  fingerprintsOf({ get: () => schema })(COLLECTION, doc) ?? {};

const schema: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  { name: "slug", type: "text" },
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

describe("a document's field fingerprints", () => {
  it("emits one entry per translatable leaf, keyed by its id-based address", () => {
    expect(Object.keys(fieldFingerprintsOf(doc, schema)).sort()).toEqual([
      "items.a1.label",
      "items.b2.label",
      "title",
    ]);
  });

  it("leaves out what the projection leaves out", () => {
    expect(fieldFingerprintsOf(doc, schema)).not.toHaveProperty("slug");
  });

  it("gives a leaf the same hash for the same text, and a different one when the text changes", () => {
    const before = fieldFingerprintsOf(doc, schema);
    const again = fieldFingerprintsOf({ ...doc }, schema);
    const edited = fieldFingerprintsOf({ ...doc, title: "Another Title" }, schema);

    expect(again.title).toBe(before.title);
    expect(edited.title).not.toBe(before.title);
  });

  it("does not move a sibling's hash when an element is inserted ahead of it", () => {
    const before = fieldFingerprintsOf(doc, schema);
    const inserted = fieldFingerprintsOf(
      { ...doc, items: [{ id: "z9", label: "Inserted" }, ...doc.items] },
      schema
    );

    expect(inserted["items.a1.label"]).toBe(before["items.a1.label"]);
    expect(inserted["items.b2.label"]).toBe(before["items.b2.label"]);
    expect(inserted["items.z9.label"]).toBeDefined();
  });

  it("drops the address of a leaf that is no longer in the document", () => {
    const withoutItems = fieldFingerprintsOf({ title: "The Title" }, schema);
    expect(withoutItems).toEqual({ title: expect.any(String) });
  });

  it("returns an empty map for a document with nothing translatable", () => {
    expect(fieldFingerprintsOf({ slug: "only-this" }, schema)).toEqual({});
  });
});

const richSchema: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "richText", localized: true },
];

const richDoc = () => ({
  title: "Shop",
  body: {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "Buy now" }] },
        { type: "block", fields: { blockType: "cta", heading: "Subscribe" } },
      ],
    },
  },
});

const objectsByPath = (
  value: unknown,
  path: string,
  into: Map<string, object>
): Map<string, object> => {
  if (typeof value !== "object" || value === null) return into;
  into.set(path, value);
  for (const [key, child] of Object.entries(value)) objectsByPath(child, `${path}.${key}`, into);
  return into;
};

describe("the document a fingerprint is taken from", () => {
  it("is read, never rebuilt: every object in it is still the same object afterwards", () => {
    const given = richDoc();
    const before = objectsByPath(given, "", new Map());

    fieldFingerprintsOf(given, richSchema);

    const after = objectsByPath(given, "", new Map());
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [path, object] of before) expect(after.get(path)).toBe(object);
  });

  it("is not merely equal to what it was — a replaced subtree would pass that test", () => {
    const given = richDoc();
    const rebuilt = { ...given, body: structuredClone(given.body) };

    expect(rebuilt).toEqual(given);
    expect(rebuilt.body).not.toBe(given.body);
  });
});
