import { describe, it, expect } from "vitest";

import { collectSerializedLexicalTextNodes } from "./collectTextNodes";

const createNode = (
  type: string,
  props?: Record<string, any>,
  children?: any[]
) => ({ type, ...props, ...(children && { children }) }) as any;

describe("collectSerializedLexicalTextNodes", () => {
  describe("text node collection", () => {
    it("collects text nodes with content", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "Hello" })]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(1);
      expect(refs[0].node.text).toBe("Hello");
    });

    it("collects multiple text nodes", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Hello" }),
          createNode("text", { text: "World" }),
        ]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(2);
      expect(refs[0].node.text).toBe("Hello");
      expect(refs[1].node.text).toBe("World");
    });

    it("collects text nodes from multiple paragraphs", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "First" })]),
        createNode("paragraph", {}, [createNode("text", { text: "Second" })]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(2);
      expect(refs[0].node.text).toBe("First");
      expect(refs[1].node.text).toBe("Second");
    });
  });

  describe("empty text filtering", () => {
    it("skips empty text nodes", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [createNode("text", { text: "" })]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(0);
    });

    it("skips whitespace-only text nodes", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "   \n\t  " }),
        ]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(0);
    });

    it("collects text with leading/trailing whitespace", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "  content  " }),
        ]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(1);
      expect(refs[0].node.text).toBe("  content  ");
    });

    it("mixes empty and non-empty text nodes", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "" }),
          createNode("text", { text: "content" }),
          createNode("text", { text: "   " }),
          createNode("text", { text: "more" }),
        ]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(2);
      expect(refs[0].node.text).toBe("content");
      expect(refs[1].node.text).toBe("more");
    });
  });

  describe("nested structures", () => {
    it("collects from deeply nested structures", () => {
      const root = createNode("root", {}, [
        createNode("list", {}, [
          createNode("listitem", {}, [
            createNode("paragraph", {}, [
              createNode("text", { text: "Item 1" }),
            ]),
          ]),
          createNode("listitem", {}, [
            createNode("paragraph", {}, [
              createNode("text", { text: "Item 2" }),
            ]),
          ]),
        ]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(2);
      expect(refs[0].node.text).toBe("Item 1");
      expect(refs[1].node.text).toBe("Item 2");
    });

    it("collects from link nodes", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("text", { text: "Click " }),
          createNode("link", { url: "https://example.com" }, [
            createNode("text", { text: "here" }),
          ]),
          createNode("text", { text: " to continue" }),
        ]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(3);
      expect(refs[0].node.text).toBe("Click ");
      expect(refs[1].node.text).toBe("here");
      expect(refs[2].node.text).toBe(" to continue");
    });
  });

  describe("mutation via references", () => {
    it("returns references that can mutate original nodes", () => {
      const textNode = createNode("text", { text: "Original" });
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [textNode]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      refs[0].node.text = "Translated";

      expect(textNode.text).toBe("Translated");
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty root", () => {
      const root = createNode("root", {}, []);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(0);
    });

    it("returns empty array for root without children", () => {
      const root = { type: "root" } as any;

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(0);
    });

    it("returns empty array for paragraph without text nodes", () => {
      const root = createNode("root", {}, [
        createNode("paragraph", {}, [
          createNode("upload", { relationTo: "media" }),
        ]),
      ]);

      const refs = collectSerializedLexicalTextNodes(root);

      expect(refs).toHaveLength(0);
    });
  });
});
