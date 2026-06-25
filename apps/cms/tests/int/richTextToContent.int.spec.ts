import type { DocStore } from "@focus-reactive/payload-plugin-seo/content";
import { describe, expect, it } from "vitest";

import { collectRichTextRefs } from "@/lib/contentExtraction/richTextRefs";
import { richTextToContent } from "@/lib/contentExtraction/richTextToContent";

function store(map: Record<string, Record<string, unknown>> = {}): DocStore {
  return { get: (collection, id) => map[`${collection}:${id}`] };
}

function ctx(map: Record<string, Record<string, unknown>> = {}) {
  return { docs: store(map), locale: "en" };
}

function root(children: unknown[]) {
  return { root: { type: "root", children } };
}

const htmlOf = (node: unknown): string => (node as { html: string }).html;

describe("richTextToContent", () => {
  it("serializes a paragraph with formatting + a resolved internal link into one html node", () => {
    const value = root([
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Read ", format: 0 },
          {
            type: "link",
            fields: { linkType: "internal", doc: { relationTo: "posts", value: 7 } },
            children: [{ type: "text", text: "the guide", format: 1 }],
          },
          { type: "text", text: " now", format: 0 },
        ],
      },
    ]);
    const out = richTextToContent(value, ctx({ "posts:7": { slug: "guide" } }));
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("html");
    const h = htmlOf(out[0]);
    expect(h.startsWith("<p>")).toBe(true);
    expect(h).toContain("Read ");
    expect(h).toContain("<strong>the guide</strong>");
    expect(h).toMatch(/<a href="[^"]*guide">/u);
  });

  it("renders a heading as an hN html node", () => {
    const out = richTextToContent(
      root([
        { type: "heading", tag: "h2", children: [{ type: "text", text: "Title", format: 0 }] },
      ]),
      ctx()
    );
    expect(htmlOf(out[0])).toBe("<h2>Title</h2>");
  });

  it("renders a custom (external) inline link with its url", () => {
    const out = richTextToContent(
      root([
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              fields: { linkType: "custom", url: "https://ext.com" },
              children: [{ type: "text", text: "ext", format: 0 }],
            },
          ],
        },
      ]),
      ctx()
    );
    expect(htmlOf(out[0])).toContain('<a href="https://ext.com">ext</a>');
  });

  it("resolves an inline upload node to an image via the DocStore", () => {
    const out = richTextToContent(
      root([{ type: "upload", relationTo: "media", value: 9, fields: {} }]),
      ctx({ "media:9": { url: "/a.jpg", alt: "Alt" } })
    );
    expect(out).toContainEqual({ type: "image", src: "/a.jpg", alt: "Alt" });
  });

  it("expands a codeInline block into an escaped <pre><code> html node", () => {
    const out = richTextToContent(
      root([
        {
          type: "block",
          fields: { blockType: "codeInline", language: "ts", code: "const x = 1 < 2;" },
        },
      ]),
      ctx()
    );
    const h = htmlOf(out[0]);
    expect(h).toContain('<pre><code class="language-ts">');
    expect(h).toContain("const x = 1 &lt; 2;");
  });

  it("expands cardsGridInline items into heading/paragraph/image/link", () => {
    const out = richTextToContent(
      root([
        {
          type: "block",
          fields: {
            blockType: "cardsGridInline",
            items: [
              {
                title: "Card",
                description: "Desc",
                image: { image: 9 },
                link: { type: "custom", url: "https://x.com", label: "Go" },
              },
            ],
          },
        },
      ]),
      ctx({ "media:9": { url: "/c.jpg", alt: "C" } })
    );
    expect(out).toContainEqual({ type: "heading", level: 3, text: "Card" });
    expect(out).toContainEqual({ type: "paragraph", text: "Desc" });
    expect(out).toContainEqual({ type: "image", src: "/c.jpg", alt: "C" });
    expect(out).toContainEqual({ type: "link", href: "https://x.com", text: "Go" });
  });

  it("expands logosInline into a label paragraph + per-item image/link", () => {
    const out = richTextToContent(
      root([
        {
          type: "block",
          fields: {
            blockType: "logosInline",
            label: "Trusted by",
            items: [{ image: { image: 9 }, link: { type: "custom", url: "/p", label: "P" } }],
          },
        },
      ]),
      ctx({ "media:9": { url: "/l.jpg", alt: "L" } })
    );
    expect(out).toContainEqual({ type: "paragraph", text: "Trusted by" });
    expect(out).toContainEqual({ type: "image", src: "/l.jpg", alt: "L" });
    expect(out).toContainEqual({ type: "link", href: "/p", text: "P" });
  });

  it("preserves text from an unknown/structural node (e.g. table) instead of dropping it", () => {
    const out = richTextToContent(
      root([
        {
          type: "table",
          children: [{ type: "tablerow", children: [{ type: "text", text: "cell text" }] }],
        },
      ]),
      ctx()
    );
    expect(out).toContainEqual({ type: "paragraph", text: "cell text" });
  });

  it("renders an autolink node whose url is stored at the node level", () => {
    const out = richTextToContent(
      root([
        {
          type: "paragraph",
          children: [
            {
              type: "autolink",
              url: "https://auto.example",
              children: [{ type: "text", text: "auto.example", format: 0 }],
            },
          ],
        },
      ]),
      ctx()
    );
    expect(htmlOf(out[0])).toContain('<a href="https://auto.example">auto.example</a>');
  });

  it("returns [] for empty / non-lexical values", () => {
    expect(richTextToContent(null, ctx())).toEqual([]);
    expect(richTextToContent({ root: { children: [] } }, ctx())).toEqual([]);
  });
});

describe("collectRichTextRefs", () => {
  it("collects inline upload media ids and internal link doc refs (deduped); ignores custom links", () => {
    const value = root([
      { type: "upload", relationTo: "media", value: 9, fields: {} },
      {
        type: "paragraph",
        children: [
          {
            type: "link",
            fields: { linkType: "internal", doc: { relationTo: "page", value: 1 } },
            children: [],
          },
          {
            type: "link",
            fields: { linkType: "internal", doc: { relationTo: "page", value: 1 } },
            children: [],
          },
          { type: "link", fields: { linkType: "custom", url: "/x" }, children: [] },
        ],
      },
      { type: "upload", relationTo: "media", value: 9, fields: {} },
    ]);
    const refs = collectRichTextRefs(value);
    expect(refs.media).toEqual([9]);
    expect(refs.links).toEqual([{ collection: "page", id: 1 }]);
  });

  it("returns empty refs when there are no inline upload/link nodes", () => {
    const refs = collectRichTextRefs(
      root([{ type: "paragraph", children: [{ type: "text", text: "hi" }] }])
    );
    expect(refs.media).toEqual([]);
    expect(refs.links).toEqual([]);
  });
});
