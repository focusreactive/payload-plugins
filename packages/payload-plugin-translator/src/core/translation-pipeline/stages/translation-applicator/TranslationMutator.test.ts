import { describe, it, expect } from "vitest";
import type { PlainTextChunk, RichContainerChunk, RichTextChunk, TextChunk } from "../../types";
import type { InlineFragment } from "../../../kernel/lexical/collectInlineFragments";
import type { SerializedLexicalNode } from "../../../kernel/lexical";
import type { SerializedTextNode } from "../../../kernel/lexical";
import { TranslationMutator } from "./TranslationMutator";

// Helper to create a mock SerializedTextNode with required properties
const createTextNode = (text: string): SerializedTextNode =>
  ({
    type: "text",
    text,
    version: 1,
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
  }) as SerializedTextNode;

/** Direct text leaves, so `top` and `node` are one object — what the collector emits for them. */
const paragraph = () => {
  const leaves = [createTextNode("a "), createTextNode("red"), createTextNode(" car")];
  const container = { type: "paragraph", children: [...leaves] } as SerializedLexicalNode;
  const fragments: InlineFragment[] = leaves.map((leaf, at) => ({
    markId: at + 1,
    text: leaf.text,
    node: leaf,
    top: leaf,
  }));
  return { container, leaves, fragments };
};

const chunkOf = (
  container: SerializedLexicalNode,
  fragments: InlineFragment[],
  reply?: { markId: number; text: string }[]
): RichContainerChunk => ({
  type: "richContainer",
  index: 0,
  text: "<1>a </1><2>red</2><3> car</3>",
  containerRef: container,
  fragments,
  ...(reply ? { reply } : {}),
});

const textsOf = (container: SerializedLexicalNode) =>
  ((container as unknown as { children?: { text?: string }[] }).children ?? []).map((c) => c.text);

describe("TranslationMutator", () => {
  const mutator = new TranslationMutator();

  describe("apply with PlainTextChunks", () => {
    it("mutates dataRef with translation", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, text: "Hello", dataRef: data, key: "title" },
      ];
      const translations = { 0: "Привет" };

      mutator.apply(chunks, translations);

      expect(data.title).toBe("Привет");
    });

    it("mutates multiple plain text chunks", () => {
      const data1 = { title: "Hello" };
      const data2 = { description: "World" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, text: "Hello", dataRef: data1, key: "title" },
        { type: "plain", index: 1, text: "World", dataRef: data2, key: "description" },
      ];
      const translations = { 0: "Привет", 1: "Мир" };

      mutator.apply(chunks, translations);

      expect(data1.title).toBe("Привет");
      expect(data2.description).toBe("Мир");
    });

    it("skips chunks without translation", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, text: "Hello", dataRef: data, key: "title" },
      ];
      const translations = {}; // No translation for index 0

      mutator.apply(chunks, translations);

      expect(data.title).toBe("Hello"); // Unchanged
    });
  });

  describe("apply with RichTextChunks", () => {
    it("mutates nodeRef.text with translation", () => {
      const textNode = createTextNode("Hello");
      const chunks: RichTextChunk[] = [
        { type: "richText", index: 0, text: "Hello", nodeRef: textNode },
      ];
      const translations = { 0: "Привет" };

      mutator.apply(chunks, translations);

      expect(textNode.text).toBe("Привет");
    });

    it("mutates multiple text nodes in richText", () => {
      const node1 = createTextNode("Hello");
      const node2 = createTextNode("World");
      const chunks: RichTextChunk[] = [
        { type: "richText", index: 0, text: "Hello", nodeRef: node1 },
        { type: "richText", index: 1, text: "World", nodeRef: node2 },
      ];
      const translations = { 0: "Привет", 1: "Мир" };

      mutator.apply(chunks, translations);

      expect(node1.text).toBe("Привет");
      expect(node2.text).toBe("Мир");
    });
  });

  describe("apply with mixed chunks", () => {
    it("handles both plain and richText chunks", () => {
      const plainData = { title: "Hello" };
      const richTextNode = createTextNode("World");

      const chunks: TextChunk[] = [
        { type: "plain", index: 0, text: "Hello", dataRef: plainData, key: "title" },
        { type: "richText", index: 1, text: "World", nodeRef: richTextNode },
      ];
      const translations = { 0: "Привет", 1: "Мир" };

      mutator.apply(chunks, translations);

      expect(plainData.title).toBe("Привет");
      expect(richTextNode.text).toBe("Мир");
    });

    it("applies partial translations", () => {
      const data1 = { title: "Hello" };
      const data2 = { subtitle: "World" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, text: "Hello", dataRef: data1, key: "title" },
        { type: "plain", index: 1, text: "World", dataRef: data2, key: "subtitle" },
      ];
      const translations = { 0: "Привет" }; // Only first chunk translated

      mutator.apply(chunks, translations);

      expect(data1.title).toBe("Привет");
      expect(data2.subtitle).toBe("World"); // Unchanged
    });
  });

  describe("edge cases", () => {
    it("handles empty chunks array", () => {
      const translations = { 0: "Привет" };

      // Should not throw
      expect(() => mutator.apply([], translations)).not.toThrow();
    });

    it("handles empty translations", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, text: "Hello", dataRef: data, key: "title" },
      ];

      mutator.apply(chunks, {});

      expect(data.title).toBe("Hello");
    });

    it("preserves other properties in dataRef", () => {
      const data = { title: "Hello", slug: "hello", count: 42 };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, text: "Hello", dataRef: data, key: "title" },
      ];
      const translations = { 0: "Привет" };

      mutator.apply(chunks, translations);

      expect(data).toEqual({ title: "Привет", slug: "hello", count: 42 });
    });
  });

  describe("apply with a RichContainerChunk", () => {
    it("rebuilds children in the reply's order", () => {
      const { container, fragments } = paragraph();
      const chunk = chunkOf(container, fragments, [
        { markId: 1, text: "une " },
        { markId: 3, text: "voiture " },
        { markId: 2, text: "rouge" },
      ]);

      mutator.apply([chunk], {});

      expect(textsOf(container)).toEqual(["une ", "voiture ", "rouge"]);
    });

    it("drops the node of a mark that came back empty", () => {
      const { container, fragments } = paragraph();
      const chunk = chunkOf(container, fragments, [
        { markId: 1, text: "une voiture rouge" },
        { markId: 2, text: "" },
        { markId: 3, text: "" },
      ]);

      mutator.apply([chunk], {});

      expect(textsOf(container)).toEqual(["une voiture rouge"]);
    });

    it("leaves the container untouched when no reply was parsed", () => {
      const { container, fragments } = paragraph();
      const chunk = chunkOf(container, fragments);

      mutator.apply([chunk], { 0: "<1>une </1><2>rouge</2><3> voiture</3>" });

      expect(textsOf(container)).toEqual(["a ", "red", " car"]);
    });
  });
});
