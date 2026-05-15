import { describe, it, expect } from "vitest";

import { isEmptyRichText } from "./isEmptyRichText";

const createRichText = (root: any) => ({ root }) as any;

describe("isEmptyRichText", () => {
  describe("empty cases", () => {
    it("returns true for empty root with no children", () => {
      const value = createRichText({
        children: [],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(true);
    });

    it("returns true for root with empty paragraph", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(true);
    });

    it("returns true for paragraph with empty text node", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "",
              },
            ],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(true);
    });

    it("returns true for paragraph with whitespace-only text", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "   \n\t  ",
              },
            ],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(true);
    });

    it("returns true for multiple empty paragraphs", () => {
      const value = createRichText({
        children: [
          { type: "paragraph", children: [] },
          { type: "paragraph", children: [{ type: "text", text: "" }] },
          { type: "paragraph", children: [{ type: "text", text: "  " }] },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(true);
    });
  });

  describe("non-empty cases - text content", () => {
    it("returns false for paragraph with text content", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Hello world",
              },
            ],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for text with leading/trailing whitespace", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "  content  ",
              },
            ],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for multiple text nodes with one having content", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [
              { type: "text", text: "" },
              { type: "text", text: "content" },
              { type: "text", text: "" },
            ],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });
  });

  describe("non-empty cases - structural nodes", () => {
    it("returns false for heading node", () => {
      const value = createRichText({
        children: [
          {
            type: "heading",
            tag: "h1",
            children: [],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for upload node", () => {
      const value = createRichText({
        children: [
          {
            type: "upload",
            relationTo: "media",
            value: { id: "123" },
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for block node", () => {
      const value = createRichText({
        children: [
          {
            type: "block",
            blockType: "cta",
            fields: {},
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for relationship node", () => {
      const value = createRichText({
        children: [
          {
            type: "relationship",
            relationTo: "posts",
            value: { id: "456" },
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for list node", () => {
      const value = createRichText({
        children: [
          {
            type: "list",
            listType: "bullet",
            children: [],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for quote node", () => {
      const value = createRichText({
        children: [
          {
            type: "quote",
            children: [],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("returns false for link node nested in paragraph", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://example.com",
                children: [],
              },
            ],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });
  });

  describe("early exit optimization", () => {
    it("stops traversal on first content found", () => {
      const value = createRichText({
        children: [
          {
            type: "paragraph",
            children: [
              { type: "text", text: "content" },
              { type: "text", text: "more content" },
            ],
          },
          {
            type: "paragraph",
            children: [{ type: "text", text: "even more" }],
          },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });

    it("stops traversal on first structural node", () => {
      const value = createRichText({
        children: [
          { type: "heading", tag: "h1", children: [] },
          { type: "paragraph", children: [{ type: "text", text: "" }] },
        ],
        type: "root",
      });
      expect(isEmptyRichText(value)).toBe(false);
    });
  });
});
