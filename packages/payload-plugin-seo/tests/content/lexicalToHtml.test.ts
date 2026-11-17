import { describe, expect, it, vi } from "vitest";
import { lexicalToHtml } from "../../src/content/lexicalToHtml";
import { runAnalysis } from "../../src/engine/runAnalysis";

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

const internalLinkState = {
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Read about " },
          {
            type: "link",
            fields: {
              linkType: "internal",
              doc: { relationTo: "pages", value: { id: 15, title: "Features" } },
            },
            children: [{ type: "text", text: "cadence" }],
          },
          { type: "text", text: " and " },
          {
            type: "link",
            fields: { linkType: "internal", doc: { relationTo: "posts", value: "abc" } },
            children: [{ type: "text", text: "drafts" }],
          },
        ],
      },
    ],
  },
};

describe("lexicalToHtml — internal links", () => {
  it("renders internal links as site-relative anchors without logging an error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const html = lexicalToHtml(internalLinkState);

    expect(html).toContain('<a href="/pages/15">cadence</a>');
    expect(html).toContain('<a href="/posts/abc">drafts</a>');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("counts the internal links in the analysis", () => {
    const result = runAnalysis({
      title: "Cadence",
      slug: "cadence",
      description: "Cadence",
      contentHtml: lexicalToHtml(internalLinkState),
      keyphrase: "cadence",
      keyphrases: [{ text: "cadence", synonyms: [] }],
      locale: "en",
      site: { name: "Demo", baseUrl: "https://demo.test" },
      has: { seoTitle: true, metaDescription: true, slug: true, content: true },
    });
    const internalLinks = result.onPage.checks.find((check) => check.id === "internalLinks");

    expect(internalLinks?.data).toMatchObject({ total: 2 });
  });
});
