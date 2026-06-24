import type { ClientField } from "payload";
import { describe, expect, it, vi } from "vitest";
import { buildAnalysisInput } from "../../src/components/SeoDrawer/build-analysis-input";
import type { ExtractContext } from "../../src/content/extract/context";
import { refKey } from "../../src/content/resolve/types";

const field = (f: Record<string, unknown>) => f as unknown as ClientField;

const ctx = (over: Partial<ExtractContext> = {}): ExtractContext => ({
  getFields: () => [],
  isUploadCollection: (s) => s === "media",
  slugPath: () => "slug",
  blocksBySlug: {},
  resolved: new Map(),
  baseUrl: "https://x.com",
  ...over,
});

const resolver = (docs: Record<string, Record<string, unknown>> = {}) => ({
  resolve: vi.fn(async () => new Map(Object.entries(docs))),
  invalidate: vi.fn(),
});

describe("buildAnalysisInput", () => {
  it("resolves host refs at depth-1 and serializes extracted content", async () => {
    const r = resolver({ [refKey({ collection: "media", id: 1 })]: { url: "/a.jpg", mimeType: "image/jpeg", alt: "A" } });
    const out = await buildAnalysisInput({
      values: { title: "T", cover: 1, body: "Hello" },
      locale: "en",
      payloadLocale: "en",
      keyphrase: "k",
      fields: { seoTitle: "title", content: {} },
      site: { name: "S", baseUrl: "https://x.com" },
      hostFields: [field({ name: "cover", type: "upload", relationTo: "media" }), field({ name: "body", type: "text" })],
      ctx: ctx(),
      resolver: r as never,
      resolveDepth: 2,
    });
    expect(r.resolve).toHaveBeenCalledWith(expect.any(Array), "en", 1);
    expect(out.contentHtml).toContain('<img src="/a.jpg"');
    expect(out.contentHtml).toContain("<p>Hello</p>");
  });

  it("skips resolution entirely when resolveDepth is 0", async () => {
    const r = resolver();
    await buildAnalysisInput({
      values: { body: "Hello" },
      locale: "en",
      payloadLocale: "en",
      keyphrase: "k",
      fields: { content: {} },
      site: { name: "S", baseUrl: "https://x.com" },
      hostFields: [field({ name: "body", type: "text" })],
      ctx: ctx(),
      resolver: r as never,
      resolveDepth: 0,
    });
    expect(r.resolve).not.toHaveBeenCalled();
  });

  it("uses the override with hydrated values when provided", async () => {
    const r = resolver({ [refKey({ collection: "media", id: 1 })]: { url: "/a.jpg", mimeType: "image/jpeg" } });
    const override = vi.fn(async (v: Record<string, unknown>) => {
      expect((v.cover as Record<string, unknown>).url).toBe("/a.jpg");
      return [{ type: "paragraph", text: "OV" } as const];
    });
    const out = await buildAnalysisInput({
      values: { cover: 1 },
      locale: "en",
      payloadLocale: "en",
      keyphrase: "k",
      fields: { content: {} },
      site: { name: "S", baseUrl: "https://x.com" },
      hostFields: [field({ name: "cover", type: "upload", relationTo: "media" })],
      ctx: ctx(),
      resolver: r as never,
      resolveDepth: 2,
      override,
    });
    expect(override).toHaveBeenCalled();
    expect(out.contentHtml).toBe("<p>OV</p>");
  });
});
