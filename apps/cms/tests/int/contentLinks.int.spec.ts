import { afterEach, describe, expect, it, vi } from "vitest";

import {
  collectLinkRefs,
  fetchLinkDocs,
  isLinkValue,
  linkRefKey,
  linkToContentNode,
} from "@/lib/contentExtraction";
import type { LinkResolveCtx, LinkValue, ResolvedLinkDoc } from "@/lib/contentExtraction";

function ctx(docs: Array<[string, ResolvedLinkDoc]> = [], locale = "en"): LinkResolveCtx {
  return { docsById: new Map(docs), locale };
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

describe("fetchLinkDocs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("batches by collection and maps docs by ref key", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const collection = url.includes("/page?") ? "page" : "posts";
      const docs = collection === "page" ? [{ id: 1, slug: "about" }] : [{ id: 7, slug: "hello" }];
      return { ok: true, json: async () => ({ docs }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await fetchLinkDocs(
      [
        { collection: "page", id: 1 },
        { collection: "posts", id: 7 },
      ],
      { apiRoute: "/api", locale: "en" }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.get(linkRefKey({ collection: "page", id: 1 }))).toEqual({ id: 1, slug: "about" });
    expect(out.get(linkRefKey({ collection: "posts", id: 7 }))).toEqual({ id: 7, slug: "hello" });
  });

  it("returns an empty map when apiRoute is missing or there are no refs", async () => {
    expect((await fetchLinkDocs([], { apiRoute: "/api", locale: "en" })).size).toBe(0);
    expect(
      (await fetchLinkDocs([{ collection: "page", id: 1 }], { apiRoute: undefined, locale: "en" }))
        .size
    ).toBe(0);
  });

  it("swallows fetch failures and returns an empty map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false }) as Response)
    );
    const out = await fetchLinkDocs([{ collection: "page", id: 1 }], {
      apiRoute: "/api",
      locale: "en",
    });
    expect(out.size).toBe(0);
  });
});
