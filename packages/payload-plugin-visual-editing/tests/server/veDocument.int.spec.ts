import { describe, expect, it } from "vitest";

import { collectionDocumentOf } from "../../src/shared/veDocument";

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
