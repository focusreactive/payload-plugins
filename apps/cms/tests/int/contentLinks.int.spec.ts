import { describe, expect, it } from "vitest";

import {
  actionLinks,
  buildRefQueries,
  collectLinkRefs,
  collectMediaIds,
  collectRelationIds,
  isLinkValue,
  linkRefKey,
  linkToContentNode,
} from "@/lib/contentExtraction";
import type { LinkResolveCtx, LinkValue, ResolvedLinkDoc } from "@/lib/contentExtraction";
import { extractPageBlockContent } from "@/collections/Page/extractPageContent";

function ctx(docs: Array<[string, ResolvedLinkDoc]> = [], locale = "en"): LinkResolveCtx {
  const map = new Map(docs);
  return {
    docs: {
      get: (collection, id) =>
        map.get(`${collection}:${id}`) as Record<string, unknown> | undefined,
    },
    locale,
  };
}

describe("isLinkValue", () => {
  it("accepts the three link types", () => {
    expect(isLinkValue({ type: "reference", label: "x" })).toBe(true);
    expect(isLinkValue({ type: "custom", url: "/x", label: "x" })).toBe(true);
    expect(isLinkValue({ type: "customPage", customPage: "blog", label: "x" })).toBe(true);
  });
  it("rejects non-links incl. lexical link nodes", () => {
    expect(isLinkValue({ type: "link", fields: {} })).toBe(false);
    expect(isLinkValue({ type: "paragraph" })).toBe(false);
    expect(isLinkValue(null)).toBe(false);
    expect(isLinkValue("custom")).toBe(false);
  });
});

describe("collectLinkRefs", () => {
  it("collects unpopulated reference ids anywhere in the tree, deduped", () => {
    const values = {
      blocks: [
        {
          actions: [{ type: "reference", reference: { relationTo: "page", value: 1 }, label: "a" }],
        },
        {
          items: [
            {
              link: { type: "reference", reference: { relationTo: "posts", value: 7 }, label: "b" },
            },
          ],
        },
        {
          actions: [
            { type: "reference", reference: { relationTo: "page", value: 1 }, label: "dup" },
          ],
        },
      ],
    };
    expect(collectLinkRefs(values)).toEqual([
      { collection: "page", id: 1 },
      { collection: "posts", id: 7 },
    ]);
  });
  it("ignores custom, customPage, and already-populated references", () => {
    const values = {
      a: { type: "custom", url: "/x", label: "c" },
      b: { type: "customPage", customPage: "blog", label: "p" },
      c: {
        type: "reference",
        reference: { relationTo: "page", value: { slug: "about" } },
        label: "r",
      },
    };
    expect(collectLinkRefs(values)).toEqual([]);
  });
});

describe("linkToContentNode", () => {
  it("resolves a custom url", () => {
    const link: LinkValue = { type: "custom", url: "https://example.com", label: "Site" };
    expect(linkToContentNode(link, ctx())).toEqual({
      type: "link",
      href: "https://example.com",
      text: "Site",
    });
  });
  it("resolves a customPage via the locale-aware resolver", () => {
    const link: LinkValue = { type: "customPage", customPage: "search", label: "Find" };
    const node = linkToContentNode(link, ctx([], "es"));
    expect(node).toEqual({ type: "link", href: "/es/search", text: "Find" });
  });
  it("resolves a page reference from the fetched docs map (relative, locale-prefixed)", () => {
    const link: LinkValue = {
      type: "reference",
      reference: { relationTo: "page", value: 1 },
      label: "About",
    };
    const docs = ctx(
      [
        [
          linkRefKey({ collection: "page", id: 1 }),
          { slug: "about", breadcrumbs: [{ url: "/about" }] },
        ],
      ],
      "es"
    );
    expect(linkToContentNode(link, docs)).toEqual({
      type: "link",
      href: "/es/about",
      text: "About",
    });
  });
  it("resolves a posts reference using the blog basePath", () => {
    const link: LinkValue = {
      type: "reference",
      reference: { relationTo: "posts", value: 7 },
      label: "Post",
    };
    const docs = ctx([[linkRefKey({ collection: "posts", id: 7 }), { slug: "hello" }]], "en");
    const node = linkToContentNode(link, docs);
    expect(node?.type).toBe("link");
    expect(node && node.type === "link" && node.href.endsWith("/hello")).toBe(true);
  });
  it("uses a populated reference object without a fetched doc", () => {
    const link: LinkValue = {
      type: "reference",
      reference: { relationTo: "page", value: { slug: "home", breadcrumbs: [{ url: "/home" }] } },
      label: "Home",
    };
    expect(linkToContentNode(link, ctx())).toEqual({ type: "link", href: "/", text: "Home" });
  });
  it("drops a reference that cannot be resolved", () => {
    const link: LinkValue = {
      type: "reference",
      reference: { relationTo: "page", value: 99 },
      label: "Gone",
    };
    expect(linkToContentNode(link, ctx())).toBeNull();
  });
  it("drops a link with no label", () => {
    const link: LinkValue = { type: "custom", url: "/x", label: "" };
    expect(linkToContentNode(link, ctx())).toBeNull();
  });
});

describe("collectMediaIds", () => {
  it("collects nested-group, flat-upload, and heroImage ids, deduped; ignores non-numeric", () => {
    const ids = collectMediaIds({
      blocks: [
        { image: { image: 1 } },
        { image: 2 },
        { slides: [{ image: { image: 1 } }] },
        { heroImage: 3 },
        { image: { image: { slug: "not-an-id" } } },
      ],
    });
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
  it("returns empty when there is no media", () => {
    expect(collectMediaIds({})).toEqual([]);
    expect(collectMediaIds({ title: "x", count: 5 })).toEqual([]);
  });
});

describe("collectRelationIds", () => {
  it("collects single ids, hasMany arrays, populated objects, deduped", () => {
    expect(
      [...collectRelationIds({ authors: [3, 4, 3], x: { authors: 4 } }, "authors")].sort(
        (a, b) => Number(a) - Number(b)
      )
    ).toEqual([3, 4]);
    expect(
      collectRelationIds(
        { blocks: [{ testimonialItems: [{ testimonial: 1 }, { testimonial: { id: 2 } }] }] },
        "testimonial"
      ).sort((a, b) => Number(a) - Number(b))
    ).toEqual([1, 2]);
    expect(collectRelationIds({}, "authors")).toEqual([]);
  });
});

describe("buildRefQueries", () => {
  it("also collects inline lexical upload media ids and internal link doc refs from richText", () => {
    const queries = buildRefQueries({
      content: {
        root: {
          type: "root",
          children: [
            { type: "upload", relationTo: "media", value: 42, fields: {} },
            {
              type: "paragraph",
              children: [
                {
                  type: "link",
                  fields: { linkType: "internal", doc: { relationTo: "posts", value: 99 } },
                  children: [],
                },
              ],
            },
          ],
        },
      },
    });
    const byCol = Object.fromEntries(queries.map((q) => [q.collection, q]));
    expect(byCol.media?.ids).toContain(42);
    expect(byCol.posts?.ids).toContain(99);
  });

  it("emits projected parallel queries for links, media, testimonials, authors, categories", () => {
    const queries = buildRefQueries({
      authors: [3],
      categories: [5],
      heroImage: 8,
      blocks: [
        {
          actions: [{ type: "reference", reference: { relationTo: "page", value: 1 }, label: "a" }],
        },
        { testimonialItems: [{ testimonial: 2 }] },
      ],
    });
    const byCol = Object.fromEntries(queries.map((q) => [q.collection, q]));
    expect(byCol.page).toMatchObject({ ids: [1], select: ["slug", "breadcrumbs"], depth: 1 });
    // `filename` is REQUIRED: Payload's upload `url` is virtual (computed from filename);
    // selecting url without filename returns url: null.
    expect(byCol.media).toMatchObject({ ids: [8], select: ["url", "filename", "mimeType", "alt"] });
    expect(byCol.testimonials).toMatchObject({
      ids: [2],
      select: ["author", "company", "position", "content"],
    });
    expect(byCol.authors).toMatchObject({ ids: [3], select: ["name"] });
    expect(byCol.categories).toMatchObject({ ids: [5], select: ["title"] });
  });
});

describe("empty array fields leaked from form state as a row-count number", () => {
  // Payload's form-state builder stores an EMPTY array field's `value` as its row
  // count (the number 0) and does NOT set `disableFormData` (only set when length > 0).
  // So `reduceFieldsToValues(formState, true)` reconstructs an empty `actions`/`items`
  // field as `0`, not `[]`. A `?? []` guard does not catch `0`, so `.map`/`.flatMap`
  // throws "0.map is not a function". The extractor must coerce non-arrays to empty.
  const helpers = {
    compact: (n: (unknown | null | undefined)[]) => n.filter(Boolean),
  } as never;

  it("actionLinks tolerates a non-array (0 / object) input", () => {
    expect(actionLinks(0 as never, ctx())).toEqual([]);
    expect(actionLinks({} as never, ctx())).toEqual([]);
  });

  it("does not throw for a content block with actions: 0 (the .map path)", () => {
    expect(() =>
      extractPageBlockContent(
        { blockType: "content", heading: "H", actions: 0 } as never,
        ctx(),
        ctx().docs as never,
        helpers
      )
    ).not.toThrow();
  });

  it("does not throw for a faq block with items: 0 (the .flatMap path)", () => {
    expect(() =>
      extractPageBlockContent(
        { blockType: "faq", heading: "H", items: 0 } as never,
        ctx(),
        ctx().docs as never,
        helpers
      )
    ).not.toThrow();
  });

  it("does not throw for a stats block with items: 0", () => {
    expect(() =>
      extractPageBlockContent(
        { blockType: "stats", items: 0 } as never,
        ctx(),
        ctx().docs as never,
        helpers
      )
    ).not.toThrow();
  });
});

describe("testimonialsList resolves relation data via DocStore", () => {
  it("reads testimonial content/author/role from the fetched doc when the value is an id", () => {
    const store = {
      get: (collection: string, id: string | number) =>
        collection === "testimonials" && id === 9
          ? { content: "Great product", author: "Jane Roe", position: "CEO", company: "Acme" }
          : undefined,
    };
    const nodes = extractPageBlockContent(
      { blockType: "testimonialsList", testimonialItems: [{ testimonial: 9 }] } as never,
      { docs: store, locale: "en" } as never,
      store as never,
      { compact: (n: (unknown | null | undefined)[]) => n.filter(Boolean) } as never
    );
    expect(nodes).toContainEqual({ type: "paragraph", text: "Great product" });
    expect(nodes).toContainEqual({ type: "paragraph", text: "Jane Roe" });
    expect(nodes).toContainEqual({ type: "paragraph", text: "CEO, Acme" });
  });
});
