import { describe, expect, it } from "vitest";
import { extractContent } from "../../src/content/extractContent";

describe("extractContent", () => {
  it("wraps plain text fragments as paragraphs", () => {
    const html = extractContent(
      { sections: [{ blockType: "copy", text: "Hello world" }] },
      { content: "sections" }
    );
    expect(html).toContain("<p>Hello world</p>");
  });

  it("converts lexical fragments and concatenates blocks in order", () => {
    const data = {
      sections: [
        { blockType: "hero", title: "Big" },
        {
          blockType: "copy",
          richText: {
            root: {
              type: "root",
              children: [{ type: "paragraph", children: [{ type: "text", text: "Body" }] }],
            },
          },
        },
      ],
    };
    const html = extractContent(data, { content: "sections" });
    expect(html.indexOf("Big")).toBeLessThan(html.indexOf("Body"));
    expect(html).toContain("<p>Big</p>");
    expect(html).toContain("Body");
  });

  it("returns empty string when the content path is missing or unset", () => {
    expect(extractContent({}, { content: "sections" })).toBe("");
    expect(extractContent({ sections: [{ blockType: "copy", text: "x" }] }, {})).toBe("");
  });

  it("reads nested dot-path content fields", () => {
    const html = extractContent({ meta: { body: "Nested" } }, { content: "meta.body" });
    expect(html).toContain("<p>Nested</p>");
  });

  it("passes link and image fragments through as raw html (no paragraph wrap, no escaping)", () => {
    const data = {
      sections: [
        {
          blockType: "hero",
          title: "Big",
          links: [{ id: "1", label: "running shoes", url: "https://other.example/running-shoes" }],
          image: {
            id: "m1",
            url: "/media/trail.jpg",
            mimeType: "image/jpeg",
            alt: "running shoes on a trail",
          },
        },
      ],
    };
    const html = extractContent(data, { content: "sections" });
    expect(html).toContain('<a href="https://other.example/running-shoes">running shoes</a>');
    expect(html).toContain('<img src="/media/trail.jpg" alt="running shoes on a trail" />');
    expect(html).not.toContain("<p><a");
    expect(html).not.toContain("&lt;a");
  });
});
