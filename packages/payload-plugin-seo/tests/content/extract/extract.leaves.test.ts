import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { extractContent } from "../../../src/content/extract/extract";
import type { ExtractContext } from "../../../src/content/extract/context";
import { refKey } from "../../../src/content/resolve/types";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;

const ctx = (resolved: Record<string, Record<string, unknown>> = {}): ExtractContext => ({
  getFields: () => [],
  isUploadCollection: (s) => s === "media",
  slugPath: () => "slug",
  blocksBySlug: {},
  resolved: new Map(Object.entries(resolved)),
  baseUrl: "https://x.com",
});

const run = (values: Record<string, unknown>, fields: ClientField[], c = ctx(), depth = 2) =>
  extractContent({ values, fields, ctx: c, selection: { include: [], exclude: [] }, metadataPaths: [], depth });

describe("extractContent — leaves", () => {
  it("text → paragraph", () => {
    expect(run({ t: "Hello" }, [field({ name: "t", type: "text" })])).toEqual([{ type: "paragraph", text: "Hello" }]);
  });

  it("upload image → image node from resolved host ref (mono id)", () => {
    const c = ctx({ [refKey({ collection: "media", id: 1 })]: { url: "/a.jpg", mimeType: "image/jpeg", alt: "A" } });
    expect(run({ cover: 1 }, [field({ name: "cover", type: "upload", relationTo: "media" })], c)).toEqual([{ type: "image", src: "/a.jpg", alt: "A" }]);
  });

  it("upload video → video node; other mime → link node", () => {
    const c = ctx({
      [refKey({ collection: "media", id: 2 })]: { url: "/v.mp4", mimeType: "video/mp4" },
      [refKey({ collection: "media", id: 3 })]: { url: "/d.pdf", mimeType: "application/pdf", filename: "d.pdf" },
    });
    const fields = [field({ name: "v", type: "upload", relationTo: "media" }), field({ name: "d", type: "upload", relationTo: "media" })];
    expect(run({ v: 2, d: 3 }, fields, c)).toEqual([
      { type: "video", src: "/v.mp4" },
      { type: "link", href: "/d.pdf", text: "d.pdf" },
    ]);
  });

  it("upload with poly value uses value.relationTo + value.value", () => {
    const c = ctx({ [refKey({ collection: "media", id: 5 })]: { url: "/p.png", mimeType: "image/png", alt: "P" } });
    expect(run({ a: { relationTo: "media", value: 5 } }, [field({ name: "a", type: "upload", relationTo: ["media", "users"] })], c)).toEqual([{ type: "image", src: "/p.png", alt: "P" }]);
  });

  it("unresolved upload ref → dropped", () => {
    expect(run({ cover: 99 }, [field({ name: "cover", type: "upload", relationTo: "media" })])).toEqual([]);
  });

  it("richText → html node", () => {
    const body = { root: { type: "root", children: [{ type: "paragraph", children: [{ type: "text", text: "Hi" }] }] } };
    const out = run({ body }, [field({ name: "body", type: "richText" })]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("html");
  });
});
