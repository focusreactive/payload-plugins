import { describe, expect, it } from "vitest";
import { transformLexical } from "../../../src/content/lexical/transform";
import type { ExtractContext } from "../../../src/content/extract/context";
import { refKey } from "../../../src/content/resolve/types";

const ctx = (resolved: Record<string, Record<string, unknown>>, slugPath = "slug"): ExtractContext => ({
  getFields: () => [],
  isUploadCollection: (s) => s === "media",
  slugPath: () => slugPath,
  blocksBySlug: {},
  resolved: new Map(Object.entries(resolved)),
  baseUrl: "https://x.com",
});

describe("transformLexical", () => {
  it("hydrates inline upload node value with the resolved doc", () => {
    const c = ctx({ [refKey({ collection: "media", id: 9 })]: { url: "/a.jpg", mimeType: "image/jpeg" } });
    const value = { root: { children: [{ type: "upload", relationTo: "media", value: 9 }] } };
    const out = transformLexical(value, c);
    expect((out.root as any).children[0].value).toEqual({ url: "/a.jpg", mimeType: "image/jpeg" });
  });

  it("rewrites internal link to a custom url built from baseUrl + slug", () => {
    const c = ctx({ [refKey({ collection: "posts", id: 11 })]: { slug: "hello" } });
    const value = { root: { children: [{ type: "link", fields: { linkType: "internal", doc: { relationTo: "posts", value: 11 } }, children: [{ text: "x" }] }] } };
    const out = transformLexical(value, c);
    const node = (out.root as any).children[0];
    expect(node.fields.linkType).toBe("custom");
    expect(node.fields.url).toBe("https://x.com/hello");
  });

  it("leaves an internal link unchanged when the target has no slug", () => {
    const c = ctx({ [refKey({ collection: "posts", id: 11 })]: { id: 11 } });
    const value = { root: { children: [{ type: "link", fields: { linkType: "internal", doc: { relationTo: "posts", value: 11 } }, children: [{ text: "x" }] }] } };
    const out = transformLexical(value, c);
    expect((out.root as any).children[0].fields.linkType).toBe("internal");
  });

  it("returns input unchanged when root is missing", () => {
    const v = { notRoot: true } as { root?: unknown };
    expect(transformLexical(v, ctx({}))).toBe(v);
  });

  it("recurses into a matched internal-link node's children (nested upload resolved)", () => {
    const c = ctx({
      [refKey({ collection: "posts", id: 11 })]: { slug: "hello" },
      [refKey({ collection: "media", id: 9 })]: { url: "/a.jpg", mimeType: "image/jpeg" },
    });
    const value = {
      root: {
        children: [
          {
            type: "link",
            fields: { linkType: "internal", doc: { relationTo: "posts", value: 11 } },
            children: [{ type: "upload", relationTo: "media", value: 9 }],
          },
        ],
      },
    };
    const link = (transformLexical(value, c).root as any).children[0];
    expect(link.fields.url).toBe("https://x.com/hello");
    expect(link.children[0].value).toEqual({ url: "/a.jpg", mimeType: "image/jpeg" });
  });

  it("leaves an unresolved upload node unchanged", () => {
    const value = { root: { children: [{ type: "upload", relationTo: "media", value: 99 }] } };
    const out = transformLexical(value, ctx({}));
    expect((out.root as any).children[0].value).toBe(99);
  });
});
