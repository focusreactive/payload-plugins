import { describe, expect, it } from "vitest";
import { lexicalToHtml } from "../../src/content/lexicalToHtml";

const headingState = {
  root: {
    type: "root",
    children: [
      { type: "heading", tag: "h2", children: [{ type: "text", text: "Comfort" }] },
      { type: "paragraph", children: [{ type: "text", text: "Hello world" }] },
    ],
  },
};

describe("lexicalToHtml", () => {
  it("returns empty string for nullish input", () => {
    expect(lexicalToHtml(null)).toBe("");
    expect(lexicalToHtml(undefined)).toBe("");
  });

  it("converts headings and paragraphs to HTML tags", () => {
    const html = lexicalToHtml(headingState);
    expect(html).toContain("<h2");
    expect(html).toContain("Comfort");
    expect(html).toContain("Hello world");
  });
});
