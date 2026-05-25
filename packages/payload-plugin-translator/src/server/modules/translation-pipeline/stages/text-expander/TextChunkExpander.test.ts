import type { Field } from "payload";
import { describe, it, expect } from "vitest";

import type { FieldChunk } from "../../types";
import { PlainTextExpander } from "./PlainTextExpander";
import { RichTextExpander } from "./RichTextExpander";
import { TextChunkExpander } from "./TextChunkExpander";

const createFieldChunk = (
  name: string,
  type: string,
  value: unknown,
  overrides: Partial<Field> = {}
): { chunk: FieldChunk; data: Record<string, unknown> } => {
  const data = { [name]: value };
  return {
    chunk: {
      dataRef: data,
      key: name,
      path: [name],
      schema: { name, type, ...overrides } as Field,
    },
    data,
  };
};

describe("PlainTextExpander", () => {
  const expander = new PlainTextExpander();

  describe("canExpand", () => {
    it("returns true for non-empty string", () => {
      const { chunk } = createFieldChunk("title", "text", "Hello");
      expect(expander.canExpand(chunk, "Hello")).toBe(true);
    });

    it("returns false for empty string", () => {
      const { chunk } = createFieldChunk("title", "text", "");
      expect(expander.canExpand(chunk, "")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
      const { chunk } = createFieldChunk("title", "text", "   ");
      expect(expander.canExpand(chunk, "   ")).toBe(false);
    });

    it("returns false for non-string values", () => {
      const { chunk } = createFieldChunk("title", "text", 123);
      expect(expander.canExpand(chunk, 123)).toBe(false);
      expect(expander.canExpand(chunk, null)).toBe(false);
      expect(expander.canExpand(chunk, {})).toBe(false);
    });
  });

  describe("expand", () => {
    it("creates PlainTextChunk with correct structure", () => {
      const { chunk, data } = createFieldChunk("title", "text", "Hello");

      const result = expander.expand(chunk, "Hello", 0);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toEqual({
        dataRef: data,
        index: 0,
        key: "title",
        text: "Hello",
        type: "plain",
      });
    });

    it("populates textMap correctly", () => {
      const { chunk } = createFieldChunk("title", "text", "Hello");

      const result = expander.expand(chunk, "Hello", 5);

      expect(result.textMap).toEqual({ 5: "Hello" });
    });

    it("increments nextIndex", () => {
      const { chunk } = createFieldChunk("title", "text", "Hello");

      const result = expander.expand(chunk, "Hello", 3);

      expect(result.nextIndex).toBe(4);
    });
  });
});

// Helper for creating Lexical nodes
const createNode = (
  type: string,
  props?: Record<string, unknown>,
  children?: unknown[]
) =>
  ({ type, ...props, ...(children && { children }) }) as Record<
    string,
    unknown
  >;

const wrapInRoot = (children: unknown[]) => ({
  root: createNode("root", {}, children),
});

describe("RichTextExpander", () => {
  const expander = new RichTextExpander();

  const createLexicalRoot = (textNodes: string[]) => ({
    root: {
      children: textNodes.map((text) => ({
        type: "paragraph",
        children: [{ type: "text", text, version: 1 }],
        direction: "ltr",
        format: "",
        indent: 0,
        version: 1,
      })),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

  describe("canExpand", () => {
    it("returns true for richText field with Lexical root", () => {
      const { chunk } = createFieldChunk(
        "content",
        "richText",
        createLexicalRoot(["Hello"])
      );
      expect(expander.canExpand(chunk, createLexicalRoot(["Hello"]))).toBe(
        true
      );
    });

    it("returns false for non-richText field type", () => {
      const { chunk } = createFieldChunk(
        "content",
        "text",
        createLexicalRoot(["Hello"])
      );
      expect(expander.canExpand(chunk, createLexicalRoot(["Hello"]))).toBe(
        false
      );
    });

    it("returns false for non-Lexical value", () => {
      const { chunk } = createFieldChunk("content", "richText", "plain string");
      expect(expander.canExpand(chunk, "plain string")).toBe(false);
    });
  });

  describe("expand", () => {
    it("creates RichTextChunk for each text node", () => {
      const value = createLexicalRoot(["Hello", "World"]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0].type).toBe("richText");
      expect(result.chunks[0].text).toBe("Hello");
      expect(result.chunks[1].text).toBe("World");
    });

    it("assigns sequential indices", () => {
      const value = createLexicalRoot(["Hello", "World"]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 10);

      expect(result.chunks[0].index).toBe(10);
      expect(result.chunks[1].index).toBe(11);
      expect(result.nextIndex).toBe(12);
    });

    it("populates textMap correctly", () => {
      const value = createLexicalRoot(["Hello", "World"]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.textMap).toEqual({ 0: "Hello", 1: "World" });
    });

    it("stores nodeRef for mutation", () => {
      const value = createLexicalRoot(["Hello"]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);
      const richTextChunk = result.chunks[0];

      // Mutate through nodeRef
      if ("nodeRef" in richTextChunk) {
        richTextChunk.nodeRef.text = "Modified";
      }

      // Check mutation affected original value
      expect(
        (value.root.children[0] as { children: { text: string }[] }).children[0]
          .text
      ).toBe("Modified");
    });
  });

  describe("complex structures", () => {
    it("expands heading with text", () => {
      const value = wrapInRoot([
        createNode("heading", { tag: "h1" }, [
          createNode("text", { text: "Title" }),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].text).toBe("Title");
    });

    it("expands list with multiple items", () => {
      const value = wrapInRoot([
        createNode("list", { listType: "bullet" }, [
          createNode("listitem", {}, [createNode("text", { text: "Item 1" })]),
          createNode("listitem", {}, [createNode("text", { text: "Item 2" })]),
          createNode("listitem", {}, [createNode("text", { text: "Item 3" })]),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(3);
      expect(result.textMap).toEqual({ 0: "Item 1", 1: "Item 2", 2: "Item 3" });
    });

    it("expands link with text inside", () => {
      const value = wrapInRoot([
        createNode("paragraph", {}, [
          createNode("text", { text: "Click " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "here" }),
          ]),
          createNode("text", { text: " to continue" }),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0].text).toBe("Click ");
      expect(result.chunks[1].text).toBe("here");
      expect(result.chunks[2].text).toBe(" to continue");
    });

    it("expands quote with nested paragraph", () => {
      const value = wrapInRoot([
        createNode("quote", {}, [
          createNode("paragraph", {}, [
            createNode("text", { text: "Famous quote" }),
          ]),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].text).toBe("Famous quote");
    });

    it("expands paragraph with multiple formatted text nodes", () => {
      const value = wrapInRoot([
        createNode("paragraph", {}, [
          createNode("text", { text: "Normal " }),
          createNode("text", { format: 1, text: "bold" }),
          createNode("text", { text: " and " }),
          createNode("text", { format: 2, text: "italic" }),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(4);
      expect(result.textMap).toEqual({
        0: "Normal ",
        1: "bold",
        2: " and ",
        3: "italic",
      });
    });

    it("expands nested list inside list item", () => {
      const value = wrapInRoot([
        createNode("list", { listType: "number" }, [
          createNode("listitem", {}, [
            createNode("text", { text: "Parent item" }),
            createNode("list", { listType: "bullet" }, [
              createNode("listitem", {}, [
                createNode("text", { text: "Nested 1" }),
              ]),
              createNode("listitem", {}, [
                createNode("text", { text: "Nested 2" }),
              ]),
            ]),
          ]),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(3);
      expect(result.textMap).toEqual({
        0: "Parent item",
        1: "Nested 1",
        2: "Nested 2",
      });
    });

    it("preserves nodeRef for mutation in complex structure", () => {
      const textNode = createNode("text", { text: "Original" });
      const value = wrapInRoot([
        createNode("list", {}, [createNode("listitem", {}, [textNode])]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      // Mutate through nodeRef
      if ("nodeRef" in result.chunks[0]) {
        result.chunks[0].nodeRef.text = "Translated";
      }

      expect(textNode.text).toBe("Translated");
    });

    it("expands mixed content (heading + paragraphs + list)", () => {
      const value = wrapInRoot([
        createNode("heading", { tag: "h1" }, [
          createNode("text", { text: "Title" }),
        ]),
        createNode("paragraph", {}, [
          createNode("text", { text: "Introduction text." }),
        ]),
        createNode("list", { listType: "bullet" }, [
          createNode("listitem", {}, [
            createNode("text", { text: "Point one" }),
          ]),
          createNode("listitem", {}, [
            createNode("text", { text: "Point two" }),
          ]),
        ]),
        createNode("paragraph", {}, [
          createNode("text", { text: "Conclusion." }),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(5);
      expect(result.textMap).toEqual({
        0: "Title",
        1: "Introduction text.",
        2: "Point one",
        3: "Point two",
        4: "Conclusion.",
      });
    });
  });

  describe("skips non-text nodes", () => {
    it("skips upload/image nodes", () => {
      const value = wrapInRoot([
        createNode("paragraph", {}, [
          createNode("text", { text: "Before image" }),
        ]),
        createNode("upload", { relationTo: "media", value: { id: "123" } }),
        createNode("paragraph", {}, [
          createNode("text", { text: "After image" }),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(2);
      expect(result.textMap).toEqual({ 0: "Before image", 1: "After image" });
    });

    it("skips linebreak nodes", () => {
      const value = wrapInRoot([
        createNode("paragraph", {}, [
          createNode("text", { text: "Line one" }),
          createNode("linebreak", {}),
          createNode("text", { text: "Line two" }),
        ]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(2);
      expect(result.textMap).toEqual({ 0: "Line one", 1: "Line two" });
    });

    it("skips horizontalrule nodes", () => {
      const value = wrapInRoot([
        createNode("paragraph", {}, [createNode("text", { text: "Above" })]),
        createNode("horizontalrule", {}),
        createNode("paragraph", {}, [createNode("text", { text: "Below" })]),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(2);
      expect(result.textMap).toEqual({ 0: "Above", 1: "Below" });
    });

    it("skips relationship/block nodes", () => {
      const value = wrapInRoot([
        createNode("paragraph", {}, [
          createNode("text", { text: "Text content" }),
        ]),
        createNode("relationship", {
          relationTo: "posts",
          value: { id: "456" },
        }),
        createNode("block", { fields: { blockType: "cta" } }),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].text).toBe("Text content");
    });

    it("only collects text nodes from mixed content", () => {
      const value = wrapInRoot([
        createNode("heading", { tag: "h1" }, [
          createNode("text", { text: "Title" }),
        ]),
        createNode("upload", { relationTo: "media" }),
        createNode("paragraph", {}, [
          createNode("text", { text: "Some " }),
          createNode("linebreak", {}),
          createNode("text", { text: "text" }),
        ]),
        createNode("horizontalrule", {}),
        createNode("list", {}, [
          createNode("listitem", {}, [createNode("text", { text: "Item" })]),
        ]),
        createNode("relationship", { relationTo: "pages" }),
      ]);
      const { chunk } = createFieldChunk("content", "richText", value);

      const result = expander.expand(chunk, value, 0);

      expect(result.chunks).toHaveLength(4);
      expect(result.textMap).toEqual({
        0: "Title",
        1: "Some ",
        2: "text",
        3: "Item",
      });
    });
  });
});

describe("TextChunkExpander", () => {
  const defaultExpanders = [new RichTextExpander(), new PlainTextExpander()];

  describe("expand", () => {
    it("expands multiple field chunks", () => {
      const data1 = { title: "Hello" };
      const data2 = { description: "World" };

      const chunks: FieldChunk[] = [
        {
          dataRef: data1,
          key: "title",
          path: ["title"],
          schema: { name: "title", type: "text" } as Field,
        },
        {
          dataRef: data2,
          key: "description",
          path: ["description"],
          schema: { name: "description", type: "text" } as Field,
        },
      ];

      const expander = new TextChunkExpander(defaultExpanders);
      const result = expander.expand(chunks);

      expect(result.textChunks).toHaveLength(2);
      expect(result.textMap).toEqual({ 0: "Hello", 1: "World" });
    });

    it("assigns unique indices across all chunks", () => {
      const richTextValue = {
        root: {
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "First", version: 1 }],
              version: 1,
            },
            {
              type: "paragraph",
              children: [{ type: "text", text: "Second", version: 1 }],
              version: 1,
            },
          ],
          type: "root",
          version: 1,
        },
      };

      const data1 = { content: richTextValue };
      const data2 = { title: "Third" };

      const chunks: FieldChunk[] = [
        {
          dataRef: data1,
          key: "content",
          path: ["content"],
          schema: { name: "content", type: "richText" } as Field,
        },
        {
          dataRef: data2,
          key: "title",
          path: ["title"],
          schema: { name: "title", type: "text" } as Field,
        },
      ];

      const expander = new TextChunkExpander(defaultExpanders);
      const result = expander.expand(chunks);

      expect(result.textChunks).toHaveLength(3);
      expect(result.textMap).toEqual({ 0: "First", 1: "Second", 2: "Third" });
    });

    it("uses first matching expander", () => {
      const data = { title: "Hello" };
      const chunks: FieldChunk[] = [
        {
          dataRef: data,
          key: "title",
          path: ["title"],
          schema: { name: "title", type: "text" } as Field,
        },
      ];

      // RichTextExpander won't match, PlainTextExpander will
      const expander = new TextChunkExpander(defaultExpanders);
      const result = expander.expand(chunks);

      expect(result.textChunks[0].type).toBe("plain");
    });

    it("skips chunks with no matching expander", () => {
      const data = { title: 123 }; // number, no expander matches
      const chunks: FieldChunk[] = [
        {
          dataRef: data,
          key: "title",
          path: ["title"],
          schema: { name: "title", type: "text" } as Field,
        },
      ];

      const expander = new TextChunkExpander(defaultExpanders);
      const result = expander.expand(chunks);

      expect(result.textChunks).toHaveLength(0);
      expect(result.textMap).toEqual({});
    });

    it("returns empty result for empty input", () => {
      const expander = new TextChunkExpander(defaultExpanders);
      const result = expander.expand([]);

      expect(result.textChunks).toEqual([]);
      expect(result.textMap).toEqual({});
    });
  });
});
