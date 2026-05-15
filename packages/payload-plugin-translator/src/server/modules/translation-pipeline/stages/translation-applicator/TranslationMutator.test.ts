import { describe, it, expect } from "vitest";

import type { SerializedTextNode } from "../../../../shared/lexical";
import type { PlainTextChunk, RichTextChunk, TextChunk } from "../../types";
import { TranslationMutator } from "./TranslationMutator";

// Helper to create a mock SerializedTextNode with required properties
const createTextNode = (text: string): SerializedTextNode =>
  ({
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    text,
    type: "text",
    version: 1,
  }) as SerializedTextNode;

describe("TranslationMutator", () => {
  const mutator = new TranslationMutator();

  describe("apply with PlainTextChunks", () => {
    it("mutates dataRef with translation", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { dataRef: data, index: 0, key: "title", text: "Hello", type: "plain" },
      ];
      const translations = { 0: "Привет" };

      mutator.apply(chunks, translations);

      expect(data.title).toBe("Привет");
    });

    it("mutates multiple plain text chunks", () => {
      const data1 = { title: "Hello" };
      const data2 = { description: "World" };
      const chunks: PlainTextChunk[] = [
        {
          dataRef: data1,
          index: 0,
          key: "title",
          text: "Hello",
          type: "plain",
        },
        {
          dataRef: data2,
          index: 1,
          key: "description",
          text: "World",
          type: "plain",
        },
      ];
      const translations = { 0: "Привет", 1: "Мир" };

      mutator.apply(chunks, translations);

      expect(data1.title).toBe("Привет");
      expect(data2.description).toBe("Мир");
    });

    it("skips chunks without translation", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { dataRef: data, index: 0, key: "title", text: "Hello", type: "plain" },
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
        { index: 0, nodeRef: textNode, text: "Hello", type: "richText" },
      ];
      const translations = { 0: "Привет" };

      mutator.apply(chunks, translations);

      expect(textNode.text).toBe("Привет");
    });

    it("mutates multiple text nodes in richText", () => {
      const node1 = createTextNode("Hello");
      const node2 = createTextNode("World");
      const chunks: RichTextChunk[] = [
        { index: 0, nodeRef: node1, text: "Hello", type: "richText" },
        { index: 1, nodeRef: node2, text: "World", type: "richText" },
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
        {
          dataRef: plainData,
          index: 0,
          key: "title",
          text: "Hello",
          type: "plain",
        },
        { index: 1, nodeRef: richTextNode, text: "World", type: "richText" },
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
        {
          dataRef: data1,
          index: 0,
          key: "title",
          text: "Hello",
          type: "plain",
        },
        {
          dataRef: data2,
          index: 1,
          key: "subtitle",
          text: "World",
          type: "plain",
        },
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
        { dataRef: data, index: 0, key: "title", text: "Hello", type: "plain" },
      ];

      mutator.apply(chunks, {});

      expect(data.title).toBe("Hello");
    });

    it("preserves other properties in dataRef", () => {
      const data = { count: 42, slug: "hello", title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { dataRef: data, index: 0, key: "title", text: "Hello", type: "plain" },
      ];
      const translations = { 0: "Привет" };

      mutator.apply(chunks, translations);

      expect(data).toEqual({ count: 42, slug: "hello", title: "Привет" });
    });
  });
});
