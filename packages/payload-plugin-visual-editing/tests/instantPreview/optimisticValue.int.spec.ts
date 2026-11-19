import { describe, expect, it } from "vitest";

import type { EditorNode } from "../../src/shared/richText/editorNodes";

import { optimisticValueOf } from "../../src/client/instantPreview/unsavedRender/optimisticValue";
import { hasReferences } from "../../src/shared/richText/references";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { META_KEY } from "../../src/shared/shared";
import { fieldAddressOf } from "../../src/shared/veDocument";

import { markerIn, valueAt } from "../support/markedData";
import { editorState, paragraph, textNode } from "../support/editorState";

const PAGE = { collectionSlug: "pages", docId: "1", kind: "collection" } as const;
const FIELD_ADDRESS = fieldAddressOf(PAGE, "body");
const META = { ...PAGE, key: "body", path: "body", terminal: true };
const FIELD = { fieldAddress: FIELD_ADDRESS, meta: META };

const photo = (id: number) => ({
  [META_KEY]: { ...META, path: "photo" },
  filename: "photo.txt",
  id,
});

const uploadNode = (value: unknown, id = "upload-saved") => ({
  fields: null,
  id,
  relationTo: "media",
  type: "upload",
  value,
  version: 3,
});

const relationshipNode = (value: unknown) => ({
  relationTo: "media",
  type: "relationship",
  value,
  version: 2,
});

const internalLink = (value: unknown, text = "Linked") => ({
  children: [textNode(text)],
  fields: { doc: { relationTo: "media", value }, linkType: "internal", newTab: false },
  id: "link-internal",
  type: "link",
  version: 3,
});

const externalLink = (fields: object = {}) => ({
  children: [textNode("Out")],
  fields: { linkType: "custom", newTab: false, url: "https://example.com", ...fields },
  type: "link",
  version: 3,
});

const block = (fields: object) => ({ fields, format: "", type: "block", version: 2 });

const markerAt = (value: unknown, path: string) => markerIn(valueAt(value, path) as string);

describe("whether a rich text value refers to data outside its editor state", () => {
  it.each([
    ["paragraphs", editorState(paragraph(textNode("Hello")))],
    [
      "a list",
      editorState({ children: [{ children: [textNode("One")], type: "listitem" }], type: "list" }),
    ],
    ["a link to a URL", editorState(paragraph(externalLink()))],
  ])("does not for %s", (_name, value) => {
    expect(hasReferences(value)).toBe(false);
  });

  it.each([
    ["a block", editorState(block({ blockType: "callout", id: "b" }))],
    ["an inline block", editorState(paragraph({ fields: { id: "i" }, type: "inlineBlock" }))],
    ["an upload", editorState(uploadNode(1))],
    ["a relationship", editorState(relationshipNode(1))],
    ["an internal link", editorState(paragraph(internalLink(1)))],
    ["a link with fields of its own", editorState(paragraph(externalLink({ credit: 3 })))],
  ])("does for %s", (_name, value) => {
    expect(hasReferences(value)).toBe(true);
  });

  it("does not for a value that is not an editor state", () => {
    expect(hasReferences(null)).toBe(false);
  });
});

describe("the value the page builds from the editor state and the base the server gave it", () => {
  it("marks the text leaves with their address and the shape of the state, and carries the meta", () => {
    const state = editorState(paragraph(textNode("Hello "), textNode("world")));

    const value = optimisticValueOf(state, FIELD, null);

    const shape = shapeOf(state, FIELD_ADDRESS);
    expect(markerAt(value, "root.children.0.children.1.text")).toEqual({ node: "0.1", shape });
    expect(value?.[META_KEY]).toEqual(META);
  });

  it("leaves the posted state as it was", () => {
    const state = editorState(paragraph(textNode("Hello")));
    const posted = structuredClone(state);

    optimisticValueOf(state, FIELD, null);

    expect(state).toEqual(posted);
  });

  it("is nothing for a state that is not a tree of nodes", () => {
    expect(optimisticValueOf({ root: { children: [1], type: "root" } }, FIELD, null)).toBeNull();
    expect(optimisticValueOf({ root: { type: "paragraph" } }, FIELD, null)).toBeNull();
  });

  it("takes the fields of a saved block from the base and keeps only the identity of a new one", () => {
    const savedFields = { blockType: "callout", id: "saved", image: photo(7), text: "Saved" };
    const base = editorState(block(savedFields));
    const state = editorState(
      block({ blockType: "callout", id: "saved", text: "Posted" }),
      block({ blockType: "callout", id: "new", text: "Posted" })
    );

    const value = optimisticValueOf(state, FIELD, base);

    expect(valueAt(value, "root.children.0.fields")).toEqual(savedFields);
    expect(valueAt(value, "root.children.1.fields")).toEqual({ blockType: "callout", id: "new" });
  });

  it("puts the documents the base populated in place of their ids", () => {
    const base = editorState(uploadNode(photo(7)), paragraph(internalLink(photo(8))));
    const state = editorState(
      paragraph(internalLink(7)),
      uploadNode(8, "upload-moved"),
      relationshipNode(7)
    );

    const value = optimisticValueOf(state, FIELD, base);

    expect(valueAt(value, "root.children.0.children.0.fields.doc.value")).toEqual(photo(7));
    expect(valueAt(value, "root.children.1.value")).toEqual(photo(8));
    expect(valueAt(value, "root.children.2.value")).toEqual(photo(7));
  });

  it("leaves out an upload or a relationship the base does not have, and keeps the addresses the server gives the text after it", () => {
    const state = editorState(
      uploadNode(9, "upload-new"),
      relationshipNode(9),
      paragraph(textNode("After"))
    );

    const value = optimisticValueOf(state, FIELD, null);

    expect((valueAt(value, "root.children") as EditorNode[]).map(({ type }) => type)).toEqual([
      "paragraph",
    ]);
    expect(markerAt(value, "root.children.0.children.0.text")).toMatchObject({ node: "2.0" });
  });

  it("keeps the id of a linked document the base does not have", () => {
    const value = optimisticValueOf(editorState(paragraph(internalLink(9))), FIELD, null);

    expect(valueAt(value, "root.children.0.children.0.fields.doc.value")).toBe(9);
  });

  it("reduces a related document posted as an object to its id", () => {
    const base = editorState(uploadNode(photo(7)));
    const state = editorState(uploadNode({ id: 7, injected: true }));

    const value = optimisticValueOf(state, FIELD, base);

    expect(valueAt(value, "root.children.0.value")).toEqual(photo(7));
  });
});
