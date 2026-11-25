import { describe, expect, it } from "vitest";

import { collectionDocumentOf, editedFieldAddressOf } from "../../src/shared/veDocument";

describe("collectionDocumentOf", () => {
  it("keeps a string or number id as the document id", () => {
    expect(collectionDocumentOf("pages", "abc")).toEqual({
      collectionSlug: "pages",
      docId: "abc",
      kind: "collection",
    });
    expect(collectionDocumentOf("pages", 7)).toEqual({
      collectionSlug: "pages",
      docId: "7",
      kind: "collection",
    });
  });

  it("leaves out an id that is missing or not a string or number", () => {
    expect(collectionDocumentOf("pages", undefined)).toEqual({
      collectionSlug: "pages",
      kind: "collection",
    });
    expect(collectionDocumentOf("pages", { id: 1 })).toEqual({
      collectionSlug: "pages",
      kind: "collection",
    });
  });
});

describe("editedFieldAddressOf", () => {
  const field = {
    collectionSlug: "pages",
    docId: "1",
    key: "hero.title",
    kind: "collection",
  } as const;

  it("is one address for one field of one locale", () => {
    expect(editedFieldAddressOf({ ...field, locale: "en" })).toBe(
      editedFieldAddressOf({ ...field, locale: "en" })
    );
  });

  it("tells apart a field of another locale, of no locale and of another document", () => {
    const addresses = new Set([
      editedFieldAddressOf(field),
      editedFieldAddressOf({ ...field, locale: "en" }),
      editedFieldAddressOf({ ...field, locale: "de" }),
      editedFieldAddressOf({ ...field, docId: "2" }),
      editedFieldAddressOf({ ...field, key: "hero.subtitle" }),
    ]);
    expect(addresses.size).toBe(5);
  });
});
