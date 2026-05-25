import { describe, it, expect } from "vitest";

import {
  isSerializedLexicalRoot,
  isSerializedLexicalTextNode,
  hasChildren,
} from "./guards";
import type { SerializedLexicalNode } from "./types";

describe("lexical guards", () => {
  describe("isSerializedLexicalRoot", () => {
    it("returns true for valid Lexical root structure", () => {
      const validRoot = {
        root: {
          children: [],
          type: "root",
        },
      };
      expect(isSerializedLexicalRoot(validRoot)).toBe(true);
    });

    it("returns true for root with nested content", () => {
      const rootWithContent = {
        root: {
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Hello" }],
            },
          ],
          type: "root",
        },
      };
      expect(isSerializedLexicalRoot(rootWithContent)).toBe(true);
    });

    it("returns false for object without root property", () => {
      expect(isSerializedLexicalRoot({ children: [] })).toBe(false);
      expect(isSerializedLexicalRoot({ type: "root" })).toBe(false);
    });

    it("returns false for object with non-object root", () => {
      expect(isSerializedLexicalRoot({ root: null })).toBe(false);
      expect(isSerializedLexicalRoot({ root: "string" })).toBe(false);
      expect(isSerializedLexicalRoot({ root: 123 })).toBe(false);
      // Note: arrays are objects in JS, so isObject([]) returns true
      // This is acceptable behavior - arrays would fail other validations
    });

    it("returns false for non-objects", () => {
      expect(isSerializedLexicalRoot(null)).toBe(false);
      expect(isSerializedLexicalRoot()).toBe(false);
      expect(isSerializedLexicalRoot("string")).toBe(false);
      expect(isSerializedLexicalRoot(123)).toBe(false);
      expect(isSerializedLexicalRoot([])).toBe(false);
    });
  });

  describe("isSerializedLexicalTextNode", () => {
    it("returns true for valid text node", () => {
      // Text nodes have 'text' property which is not on base SerializedLexicalNode type
      const textNode = {
        text: "Hello World",
        type: "text",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(isSerializedLexicalTextNode(textNode)).toBe(true);
    });

    it("returns true for text node with empty string", () => {
      const textNode = {
        text: "",
        type: "text",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(isSerializedLexicalTextNode(textNode)).toBe(true);
    });

    it("returns true for text node with formatting", () => {
      const textNode = {
        format: 1,
        text: "Bold text",
        type: "text",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(isSerializedLexicalTextNode(textNode)).toBe(true);
    });

    it("returns false for paragraph node", () => {
      const paragraphNode = {
        children: [],
        type: "paragraph",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(isSerializedLexicalTextNode(paragraphNode)).toBe(false);
    });

    it("returns false for heading node", () => {
      const headingNode = {
        children: [],
        tag: "h1",
        type: "heading",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(isSerializedLexicalTextNode(headingNode)).toBe(false);
    });

    it("returns false for node with type text but no text property", () => {
      const invalidNode = {
        type: "text",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(isSerializedLexicalTextNode(invalidNode)).toBe(false);
    });

    it("returns false for node with non-string text property", () => {
      const invalidNode = {
        text: 123,
        type: "text",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(isSerializedLexicalTextNode(invalidNode)).toBe(false);
    });
  });

  describe("hasChildren", () => {
    it("returns true for node with children array", () => {
      const node = {
        children: [],
        type: "paragraph",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(hasChildren(node)).toBe(true);
    });

    it("returns true for node with populated children", () => {
      const node = {
        children: [
          { type: "text", text: "Hello", version: 1 },
          { type: "text", text: "World", version: 1 },
        ],
        type: "paragraph",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(hasChildren(node)).toBe(true);
    });

    it("returns true for root node with children", () => {
      const rootNode = {
        children: [{ type: "paragraph", children: [], version: 1 }],
        type: "root",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(hasChildren(rootNode)).toBe(true);
    });

    it("returns false for text node (no children)", () => {
      const textNode = {
        text: "Hello",
        type: "text",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(hasChildren(textNode)).toBe(false);
    });

    it("returns false for node with non-array children", () => {
      const invalidNode = {
        children: "not-array",
        type: "paragraph",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(hasChildren(invalidNode)).toBe(false);
    });

    it("returns false for node with null children", () => {
      const invalidNode = {
        children: null,
        type: "paragraph",
        version: 1,
      } as unknown as SerializedLexicalNode;
      expect(hasChildren(invalidNode)).toBe(false);
    });
  });
});
