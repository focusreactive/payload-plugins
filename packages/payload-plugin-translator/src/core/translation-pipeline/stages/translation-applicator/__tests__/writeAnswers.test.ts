import { describe, it, expect } from "vitest";
import type {
  PlainTextChunk,
  RichContainerChunk,
  RichTextChunk,
  SettledAnswer,
  TextChunk,
} from "../../../types/index.js";
import type { InlineFragment } from "../../../../kernel/lexical/collectInlineFragments.js";
import type { SerializedLexicalNode } from "../../../../kernel/lexical/index.js";
import type { SerializedTextNode } from "../../../../kernel/lexical/index.js";
import { makeIdPath } from "../../../../domain/content-projection/idPath.js";
import { writeAnswers } from "../writeAnswers.js";

const anywhere = makeIdPath([{ kind: "key", name: "field" }]);

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
    id: at + 1,
    text: leaf.text,
    node: leaf,
    top: leaf,
  }));
  return { container, leaves, fragments };
};

const chunkOf = (
  container: SerializedLexicalNode,
  fragments: InlineFragment[]
): RichContainerChunk => ({
  type: "richContainer",
  idPath: anywhere,
  index: 0,
  containerRef: container,
  fragments,
});

const texts = (byIndex: Record<number, string>): Record<number, SettledAnswer> =>
  Object.fromEntries(
    Object.entries(byIndex).map(([index, text]) => [index, { kind: "text", text }])
  ) as Record<number, SettledAnswer>;

const segments = (answered: { id: number; text: string }[]): Record<number, SettledAnswer> => ({
  0: { kind: "segments", segments: answered },
});

const textsOf = (container: SerializedLexicalNode) =>
  ((container as unknown as { children?: { text?: string }[] }).children ?? []).map((c) => c.text);

describe("writeAnswers", () => {
  describe("apply with PlainTextChunks", () => {
    it("mutates dataRef with translation", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, idPath: anywhere, text: "Hello", dataRef: data, key: "title" },
      ];
      const translations = { 0: "Привет" };

      writeAnswers(chunks, texts(translations));

      expect(data.title).toBe("Привет");
    });

    it("mutates multiple plain text chunks", () => {
      const data1 = { title: "Hello" };
      const data2 = { description: "World" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, idPath: anywhere, text: "Hello", dataRef: data1, key: "title" },
        {
          type: "plain",
          index: 1,
          idPath: anywhere,
          text: "World",
          dataRef: data2,
          key: "description",
        },
      ];
      const translations = { 0: "Привет", 1: "Мир" };

      writeAnswers(chunks, texts(translations));

      expect(data1.title).toBe("Привет");
      expect(data2.description).toBe("Мир");
    });

    it("skips chunks without translation", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, idPath: anywhere, text: "Hello", dataRef: data, key: "title" },
      ];
      const translations = {}; // No translation for index 0

      writeAnswers(chunks, texts(translations));

      expect(data.title).toBe("Hello"); // Unchanged
    });
  });

  describe("apply with RichTextChunks", () => {
    it("mutates nodeRef.text with translation", () => {
      const textNode = createTextNode("Hello");
      const chunks: RichTextChunk[] = [
        { type: "richText", index: 0, idPath: anywhere, text: "Hello", nodeRef: textNode },
      ];
      const translations = { 0: "Привет" };

      writeAnswers(chunks, texts(translations));

      expect(textNode.text).toBe("Привет");
    });

    it("mutates multiple text nodes in richText", () => {
      const node1 = createTextNode("Hello");
      const node2 = createTextNode("World");
      const chunks: RichTextChunk[] = [
        { type: "richText", index: 0, idPath: anywhere, text: "Hello", nodeRef: node1 },
        { type: "richText", index: 1, idPath: anywhere, text: "World", nodeRef: node2 },
      ];
      const translations = { 0: "Привет", 1: "Мир" };

      writeAnswers(chunks, texts(translations));

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
          type: "plain",
          index: 0,
          idPath: anywhere,
          text: "Hello",
          dataRef: plainData,
          key: "title",
        },
        { type: "richText", index: 1, idPath: anywhere, text: "World", nodeRef: richTextNode },
      ];
      const translations = { 0: "Привет", 1: "Мир" };

      writeAnswers(chunks, texts(translations));

      expect(plainData.title).toBe("Привет");
      expect(richTextNode.text).toBe("Мир");
    });

    it("applies partial translations", () => {
      const data1 = { title: "Hello" };
      const data2 = { subtitle: "World" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, idPath: anywhere, text: "Hello", dataRef: data1, key: "title" },
        {
          type: "plain",
          index: 1,
          idPath: anywhere,
          text: "World",
          dataRef: data2,
          key: "subtitle",
        },
      ];
      const translations = { 0: "Привет" }; // Only first chunk translated

      writeAnswers(chunks, texts(translations));

      expect(data1.title).toBe("Привет");
      expect(data2.subtitle).toBe("World"); // Unchanged
    });
  });

  describe("edge cases", () => {
    it("handles empty chunks array", () => {
      const translations = { 0: "Привет" };

      // Should not throw
      expect(() => writeAnswers([], texts(translations))).not.toThrow();
    });

    it("handles empty translations", () => {
      const data = { title: "Hello" };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, idPath: anywhere, text: "Hello", dataRef: data, key: "title" },
      ];

      writeAnswers(chunks, {});

      expect(data.title).toBe("Hello");
    });

    it("preserves other properties in dataRef", () => {
      const data = { title: "Hello", slug: "hello", count: 42 };
      const chunks: PlainTextChunk[] = [
        { type: "plain", index: 0, idPath: anywhere, text: "Hello", dataRef: data, key: "title" },
      ];
      const translations = { 0: "Привет" };

      writeAnswers(chunks, texts(translations));

      expect(data).toEqual({ title: "Привет", slug: "hello", count: 42 });
    });
  });

  describe("apply with a RichContainerChunk", () => {
    it("rebuilds children in the reply's order", () => {
      const { container, fragments } = paragraph();
      const chunk = chunkOf(container, fragments);

      writeAnswers(
        [chunk],
        segments([
          { id: 1, text: "une " },
          { id: 3, text: "voiture " },
          { id: 2, text: "rouge" },
        ])
      );

      expect(textsOf(container)).toEqual(["une ", "voiture ", "rouge"]);
    });

    it("drops the node of a mark that came back empty", () => {
      const { container, fragments } = paragraph();
      const chunk = chunkOf(container, fragments);

      writeAnswers(
        [chunk],
        segments([
          { id: 1, text: "une voiture rouge" },
          { id: 2, text: "" },
          { id: 3, text: "" },
        ])
      );

      expect(textsOf(container)).toEqual(["une voiture rouge"]);
    });

    it("leaves the container untouched when its answer failed", () => {
      const { container, fragments } = paragraph();
      const chunk = chunkOf(container, fragments);

      writeAnswers([chunk], { 0: { kind: "failed", failure: { code: "malformed" } } });

      expect(textsOf(container)).toEqual(["a ", "red", " car"]);
    });

    it("stays silent about a chunk whose answer already failed, so one leaf is not named twice", () => {
      const { container, fragments } = paragraph();
      const chunk = chunkOf(container, fragments);

      const notWritten = writeAnswers([chunk], {
        0: { kind: "failed", failure: { code: "malformed" } },
      });

      expect(notWritten).toEqual(new Set());
    });
  });

  describe("what it reports back", () => {
    it("names the chunk it left unwritten, and not the one it wrote", () => {
      const data = { title: "Hello", subtitle: "World" };
      const chunks: TextChunk[] = [
        { type: "plain", index: 0, idPath: anywhere, text: "Hello", dataRef: data, key: "title" },
        {
          type: "plain",
          index: 1,
          idPath: anywhere,
          text: "World",
          dataRef: data,
          key: "subtitle",
        },
      ];

      expect(writeAnswers(chunks, texts({ 0: "Hallo" }))).toEqual(new Set([1]));
    });

    it("names a container that was never answered", () => {
      const { container, fragments } = paragraph();

      expect(writeAnswers([chunkOf(container, fragments)], {})).toEqual(new Set([0]));
    });

    it("names a container it could not write into, though a reply had parsed", () => {
      const { fragments } = paragraph();
      const childless = { type: "paragraph", version: 1 } as SerializedLexicalNode;
      const chunk = chunkOf(childless, fragments);

      expect(writeAnswers([chunk], segments([{ id: 1, text: "Hallo " }]))).toEqual(new Set([0]));
    });
  });
});
