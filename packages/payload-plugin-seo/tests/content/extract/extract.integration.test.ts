import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { extractContent } from "../../../src/content/extract/extract";
import { serialize } from "../../../src/content/schema/serialize";
import type { ExtractContext } from "../../../src/content/extract/context";
import { refKey } from "../../../src/content/resolve/types";
import { runAnalysis } from "../../../src/engine/runAnalysis";
import type { AnalysisInput } from "../../../src/engine/types/analysis";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;

const usersFields = [field({ name: "name", type: "text" }), field({ name: "avatar", type: "upload", relationTo: "media" })];
const postsFields = [
  field({ name: "slug", type: "text" }),
  field({ name: "body", type: "text" }),
  field({ name: "heroImage", type: "upload", relationTo: "media" }),
  field({ name: "brochure", type: "upload", relationTo: "media" }),
  field({ name: "author", type: "relationship", relationTo: "users" }),
  field({
    name: "cta",
    type: "array",
    fields: [field({ name: "label", type: "text" }), field({ name: "url", type: "text" })],
  }),
  field({ name: "sidebar", type: "group", fields: [field({ name: "note", type: "text" })] }),
  field({ name: "body2", type: "richText" }),
];

const resolved = new Map<string, Record<string, unknown>>([
  [refKey({ collection: "media", id: 10 }), { url: "/hero.jpg", mimeType: "image/jpeg", alt: "running shoes" }],
  [refKey({ collection: "media", id: 11 }), { url: "/brochure.pdf", mimeType: "application/pdf", filename: "brochure.pdf" }],
  [
    refKey({ collection: "users", id: 5 }),
    {
      id: 5,
      name: "Jane Writer",
      avatar: { url: "/jane.jpg", mimeType: "image/jpeg", alt: "Jane" },
      createdAt: "2020-01-02T03:04:05.000Z",
    },
  ],
  [refKey({ collection: "media", id: 12 }), { url: "/inline.jpg", mimeType: "image/jpeg", alt: "inline pic" }],
  [refKey({ collection: "posts", id: 7 }), { slug: "other-post" }],
]);

const ctx: ExtractContext = {
  getFields: (slug) => (slug === "users" ? usersFields : slug === "posts" ? postsFields : []),
  isUploadCollection: (s) => s === "media",
  slugPath: () => "slug",
  blocksBySlug: {},
  resolved,
  baseUrl: "https://site.example",
};

const values = {
  slug: "my-post",
  body: "Everything about running shoes.",
  heroImage: 10,
  brochure: 11,
  author: 5,
  cta: [{ label: "running shoes", url: "https://competitor.example/shoes" }],
  sidebar: { note: "SIDEBAR_SECRET_TEXT" },
  body2: {
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "upload", relationTo: "media", value: 12 }],
        },
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              fields: { linkType: "internal", doc: { relationTo: "posts", value: 7 } },
              children: [{ type: "text", text: "see other" }],
            },
          ],
        },
      ],
    },
  },
};

const html = serialize(
  extractContent({
    values,
    fields: postsFields,
    ctx,
    selection: { include: [], exclude: ["sidebar"] },
    metadataPaths: ["slug"],
    depth: 2,
  })
);

describe("extractContent integration (relations + uploads + links + lexical)", () => {
  it("serializes host text, image/pdf uploads, depth-2 author recursion, CTA link, and excludes sidebar + system fields", () => {
    expect(html).toContain("<p>Everything about running shoes.</p>");
    expect(html).toContain('<img src="/hero.jpg" alt="running shoes" />');
    expect(html).toContain('<a href="/brochure.pdf">brochure.pdf</a>');
    expect(html).toContain("<p>Jane Writer</p>"); // relationship recursed at depth 2
    expect(html).toContain('<img src="/jane.jpg" alt="Jane" />'); // nested populated avatar upload
    expect(html).toContain('<a href="https://competitor.example/shoes">running shoes</a>'); // CTA link heuristic
    expect(html).not.toContain("SIDEBAR_SECRET_TEXT"); // excluded path
    expect(html).not.toContain("2020-01-02"); // system field createdAt not walked (not in schema)
  });

  it("resolves inline lexical upload + internal link (href from baseUrl + target slug)", () => {
    // Real convertLexicalToHTML output (see report): the inline upload becomes an
    // <img> carrying the resolved media src + alt; the internal link is rewritten
    // to an <a> whose href is baseUrl + the target post's slug.
    expect(html).toContain('src="/inline.jpg"');
    expect(html).toContain('alt="inline pic"');
    expect(html).toContain('<a href="https://site.example/other-post">see other</a>');
  });

  it("the serialized content lights up keyphrase checks through runAnalysis", () => {
    const input: AnalysisInput = {
      title: "The Best Running Shoes",
      slug: "my-post",
      description: "Quality running shoes for runners who love running shoes.",
      contentHtml: html,
      keyphrase: "running shoes",
      locale: "en_US",
      site: { name: "Shop", baseUrl: "https://shop.example" },
      has: { seoTitle: true, metaDescription: true, slug: true, content: true },
    };
    const result = runAnalysis(input);

    const competing = result.keyphrase.checks.find((c) => c.id === "textCompetingLinks");
    expect(competing?.data, "competing external link with keyphrase anchor should resolve").toBeDefined();

    const imageKeyphrase = result.keyphrase.checks.find((c) => c.id === "imageKeyphrase");
    expect((imageKeyphrase?.data as { total?: number } | undefined)?.total).toBeGreaterThan(0);
  });
});
