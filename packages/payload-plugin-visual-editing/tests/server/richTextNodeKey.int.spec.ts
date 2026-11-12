import { describe, expect, it } from "vitest";

import { richTextNodeKeyOf } from "../../src/shared/richText/nodeKey";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { textLeavesOf } from "../../src/shared/richText/textLeaves";
import { fieldAddressOf } from "../../src/shared/veDocument";

import { editorState, paragraph, textNode } from "../support/editorState";

const PAGE = { collectionSlug: "pages", docId: "A", kind: "collection" } as const;
const BODY = fieldAddressOf(PAGE, "body");

describe("text leaves of an editor state", () => {
  it("lists every text node with its address in the tree", () => {
    const state = editorState(paragraph(textNode("Hello "), textNode("world", 1)), {
      children: [{ children: [textNode("Docs")], type: "link", version: 1 }],
      type: "heading",
      version: 1,
    });

    expect(textLeavesOf(state)).toEqual([
      { address: "0.0", text: "Hello " },
      { address: "0.1", text: "world" },
      { address: "1.0.0", text: "Docs" },
    ]);
  });

  it("skips nodes that hold no text of their own", () => {
    const state = editorState(
      paragraph(textNode("One"), { type: "linebreak", version: 1 }, textNode("Two")),
      { fields: { title: "Card" }, type: "block", version: 1 }
    );

    expect(textLeavesOf(state).map(({ address }) => address)).toEqual(["0.0", "0.2"]);
  });

  it("lists the tabs and the highlighted code Lexical keeps as text nodes", () => {
    const state = editorState(
      paragraph(textNode("Name"), { text: "\t", type: "tab", version: 1 }, textNode("Ann")),
      {
        children: [{ text: "const", type: "code-highlight", version: 1 }],
        type: "code",
        version: 1,
      }
    );

    expect(textLeavesOf(state)).toEqual([
      { address: "0.0", text: "Name" },
      { address: "0.1", text: "\t" },
      { address: "0.2", text: "Ann" },
      { address: "1.0", text: "const" },
    ]);
  });

  it("skips a node of another type that keeps data in a text property", () => {
    const state = editorState(
      paragraph(textNode("Ask "), { text: "@ann", type: "mention", version: 1 }, textNode(" first"))
    );

    expect(textLeavesOf(state)).toEqual([
      { address: "0.0", text: "Ask " },
      { address: "0.2", text: " first" },
    ]);
  });

  it("returns nothing for a value that is not an editor state", () => {
    expect(textLeavesOf(null)).toEqual([]);
    expect(textLeavesOf({ root: "nope" })).toEqual([]);
  });
});

describe("shape of an editor state", () => {
  it("stays the same when only text changes", () => {
    expect(shapeOf(editorState(paragraph(textNode("Hello"))), BODY)).toBe(
      shapeOf(editorState(paragraph(textNode("Hello there"))), BODY)
    );
  });

  it("changes when a node is added, removed or replaced by another type", () => {
    const base = shapeOf(editorState(paragraph(textNode("Hello"))), BODY);

    expect(
      shapeOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))), BODY)
    ).not.toBe(base);
    expect(shapeOf(editorState(paragraph(textNode("Hel"), textNode("lo", 1))), BODY)).not.toBe(
      base
    );
    expect(
      shapeOf(editorState({ children: [textNode("Hello")], type: "heading", version: 1 }), BODY)
    ).not.toBe(base);
  });

  it("differs between two fields that hold the same tree", () => {
    const state = editorState(paragraph(textNode("Hello")));

    expect(shapeOf(state, fieldAddressOf(PAGE, "intro"))).not.toBe(shapeOf(state, BODY));
    expect(shapeOf(state, fieldAddressOf({ ...PAGE, docId: "B" }, "body"))).not.toBe(
      shapeOf(state, BODY)
    );
    expect(shapeOf(state, fieldAddressOf(PAGE, "body"))).toBe(shapeOf(state, BODY));
  });

  it("is short and safe to put into a key", () => {
    expect(shapeOf(editorState(paragraph(textNode("Hello"))), BODY)).toMatch(/^[0-9a-z]{1,8}$/u);
  });

  it("is missing for a value that is not an editor state", () => {
    expect(shapeOf({ root: "nope" }, BODY)).toBeNull();
  });
});

describe("rich text node keys", () => {
  it("joins the field key, the shape and the address", () => {
    expect(
      richTextNodeKeyOf({ address: "1.0.0", fieldKey: "blocks.6a1f.body", shape: "k3f9a1" })
    ).toBe("blocks.6a1f.body#k3f9a1#1.0.0");
  });
});
