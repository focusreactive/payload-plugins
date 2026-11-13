import { describe, expect, it } from "vitest";

import { liveRichTextOf } from "../../src/client/instantPreview/liveRichTextOf";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { fieldAddressOf } from "../../src/shared/veDocument";

import { editorState, textNode } from "../support/editorState";

const PAGE = { collectionSlug: "pages", docId: "7", kind: "collection" } as const;
const SETTINGS = { collectionSlug: "settings", kind: "global" } as const;

const draftRead = (meta: object) => ({
  ...editorState(textNode("Body")),
  _meta: { terminal: true, ...meta },
});

describe("liveRichTextOf", () => {
  it("names the document and the field of a rich text value outside any row", () => {
    const content = draftRead({ ...PAGE, path: "body" });

    expect(liveRichTextOf(content)).toEqual({
      field: { ...PAGE, key: "body" },
      shape: shapeOf(content, fieldAddressOf(PAGE, "body")),
    });
  });

  it("names a field in a row by the key of the row", () => {
    const content = draftRead({ ...PAGE, key: "layout.row-a.body", path: "layout.0.body" });

    expect(liveRichTextOf(content)).toEqual({
      field: { ...PAGE, key: "layout.row-a.body" },
      shape: shapeOf(content, fieldAddressOf(PAGE, "layout.row-a.body")),
    });
  });

  it("names the field of a global without a document id", () => {
    const content = draftRead({ ...SETTINGS, path: "footnote" });

    expect(liveRichTextOf(content)?.field).toEqual({ ...SETTINGS, key: "footnote" });
  });

  it.each([
    ["a value that was not read as a draft", editorState(textNode("Body"))],
    ["no value", null],
    ["a field in a row that has no key", draftRead({ ...PAGE, path: "layout.0.body" })],
    ["a value read with every locale", draftRead({ ...PAGE, locale: "en", path: "body" })],
    ["a field whose key holds the separator of node keys", draftRead({ ...PAGE, path: "a#b" })],
    ["a populated document", { _meta: { ...PAGE, path: "related", terminal: true }, id: 3 }],
  ])("gives nothing for %s", (_name, content) => {
    expect(liveRichTextOf(content)).toBeNull();
  });
});
