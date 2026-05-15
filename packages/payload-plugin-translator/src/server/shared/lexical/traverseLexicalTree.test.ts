import { describe, it, expect, vi } from "vitest";

import { traverseLexicalTree } from "./traverseLexicalTree";

const createNode = (type: string, children?: any[]) =>
  ({ type, ...(children && { children }) }) as any;

describe("traverseLexicalTree", () => {
  describe("traversal order", () => {
    it("visits all nodes depth-first", () => {
      const visited: string[] = [];
      const root = createNode("root", [
        createNode("paragraph", [createNode("text"), createNode("text")]),
        createNode("paragraph", [createNode("text")]),
      ]);

      traverseLexicalTree(root, (node) => {
        visited.push(node.type);
      });

      expect(visited).toEqual([
        "root",
        "paragraph",
        "text",
        "text",
        "paragraph",
        "text",
      ]);
    });

    it("visits root node first", () => {
      const visited: string[] = [];
      const root = createNode("root", [createNode("paragraph")]);

      traverseLexicalTree(root, (node) => {
        visited.push(node.type);
      });

      expect(visited[0]).toBe("root");
    });
  });

  describe("early exit", () => {
    it("stops traversal when visitor returns false", () => {
      const visited: string[] = [];
      const root = createNode("root", [
        createNode("paragraph", [createNode("text"), createNode("text")]),
        createNode("paragraph", [createNode("text")]),
      ]);

      const result = traverseLexicalTree(root, (node) => {
        visited.push(node.type);
        if (node.type === "text") {return false;}
      });

      expect(result).toBe(false);
      expect(visited).toEqual(["root", "paragraph", "text"]);
    });

    it("returns true when traversal completes without stopping", () => {
      const root = createNode("root", [createNode("paragraph")]);

      const result = traverseLexicalTree(root, () => {});

      expect(result).toBe(true);
    });

    it("stops at root if visitor returns false immediately", () => {
      const visited: string[] = [];
      const root = createNode("root", [createNode("paragraph")]);

      const result = traverseLexicalTree(root, (node) => {
        visited.push(node.type);
        return false;
      });

      expect(result).toBe(false);
      expect(visited).toEqual(["root"]);
    });
  });

  describe("edge cases", () => {
    it("handles nodes without children property", () => {
      const visited: string[] = [];
      const node = { text: "hello", type: "text" } as any;

      traverseLexicalTree(node, (n) => {
        visited.push(n.type);
      });

      expect(visited).toEqual(["text"]);
    });

    it("handles empty children array", () => {
      const visited: string[] = [];
      const root = createNode("root", []);

      traverseLexicalTree(root, (node) => {
        visited.push(node.type);
      });

      expect(visited).toEqual(["root"]);
    });

    it("handles deeply nested structures", () => {
      const visited: string[] = [];
      const root = createNode("root", [
        createNode("list", [
          createNode("listitem", [
            createNode("paragraph", [createNode("text")]),
          ]),
        ]),
      ]);

      traverseLexicalTree(root, (node) => {
        visited.push(node.type);
      });

      expect(visited).toEqual([
        "root",
        "list",
        "listitem",
        "paragraph",
        "text",
      ]);
    });

    it("handles single node without children", () => {
      const visitor = vi.fn();
      const node = createNode("text");

      traverseLexicalTree(node, visitor);

      expect(visitor).toHaveBeenCalledTimes(1);
      expect(visitor).toHaveBeenCalledWith(node);
    });
  });

  describe("visitor behavior", () => {
    it("continues traversal when visitor returns undefined", () => {
      const visited: string[] = [];
      const root = createNode("root", [createNode("paragraph")]);

      traverseLexicalTree(root, (node) => {
        visited.push(node.type);
        return;
      });

      expect(visited).toEqual(["root", "paragraph"]);
    });

    it("continues traversal when visitor returns true", () => {
      const visited: string[] = [];
      const root = createNode("root", [createNode("paragraph")]);

      traverseLexicalTree(root, (node) => {
        visited.push(node.type);
        return true;
      });

      expect(visited).toEqual(["root", "paragraph"]);
    });
  });
});
