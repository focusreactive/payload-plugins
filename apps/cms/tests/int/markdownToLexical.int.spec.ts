import { describe, expect, it } from "vitest";

import { markdownToLexical } from "@/lib/markdown/toLexical";
import config from "@/payload.config";

interface Node {
  type: string;
  tag?: string;
  listType?: string;
  format?: number;
  text?: string;
  children?: Node[];
}

function walk(node: Node, visit: (n: Node) => void) {
  visit(node);
  for (const child of node.children ?? []) {
    walk(child, visit);
  }
}

describe("markdownToLexical", () => {
  const markdown = [
    "## Heading two",
    "",
    "Paragraph with a [link](https://example.com) and `inline code`.",
    "",
    "- outer",
    "  - nested",
    "",
    "| A | B |",
    "| --- | --- |",
    "| 1 | 2 |",
    "",
    "> quoted",
    "",
    "![Alt](/media/x.png)",
  ].join("\n");

  it("keeps headings, links, nested lists, tables, quotes and inline code", async () => {
    const state = await markdownToLexical(markdown, await config);
    const types = new Set<string>();
    let inlineCode = false;
    walk(state.root as unknown as Node, (node) => {
      types.add(node.tag ? `${node.type}:${node.tag}` : node.type);
      // Lexical text format bit 16 = code.
      if (node.type === "text" && node.text === "inline code" && ((node.format ?? 0) & 16) !== 0) {
        inlineCode = true;
      }
    });
    expect(types).toContain("heading:h2");
    expect(types).toContain("link");
    expect(types).toContain("list:ul");
    expect(types).toContain("quote");
    expect([...types].some((type) => type.startsWith("table"))).toBe(true);
    expect(inlineCode).toBe(true);
  });

  it("documents the known gap: Markdown images are not turned into uploads", async () => {
    const state = await markdownToLexical(markdown, await config);
    const types: string[] = [];
    walk(state.root as unknown as Node, (node) => types.push(node.type));
    expect(types).not.toContain("upload");
  });
});
