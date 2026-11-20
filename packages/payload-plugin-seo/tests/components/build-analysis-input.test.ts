import { describe, expect, it, vi } from "vitest";
import { buildAnalysisInput } from "../../src/components/SeoDrawer/build-analysis-input";
import type { ContentNode } from "../../src/content/schema/nodes";
import type { ContentExtractor, ExtractToolkit } from "../../src/types/config";

describe("buildAnalysisInput", () => {
  it("returns empty content when no extractor is provided", async () => {
    const out = await buildAnalysisInput({
      values: { title: "T" },
      locale: "en",
      payloadLocale: "en",
      apiRoute: "/api",
      keyphrases: [{ text: "k", synonyms: [] }],
      fields: { seoTitle: "title" },
      site: { name: "S", baseUrl: "https://x.com" },
    });
    expect(out.contentHtml).toBe("");
    expect(out.has.content).toBe(false);
  });

  it("takes the public path from the preview path resolver, with the editing locale", async () => {
    const previewPath = vi.fn(
      (values: Record<string, unknown>, ctx: { locale?: string }) =>
        `${ctx.locale}/services/${String(values.slug)}`
    );
    const out = await buildAnalysisInput({
      values: { slug: "web" },
      locale: "es",
      payloadLocale: "es",
      keyphrases: [],
      fields: {},
      site: { name: "S", baseUrl: "https://x.com" },
      previewPath,
    });
    expect(previewPath).toHaveBeenCalledWith({ slug: "web" }, { locale: "es" });
    expect(out.path).toBe("/es/services/web");
    expect(out.slug).toBe("web");
  });

  it("falls back to the slug when the resolver returns nothing or throws", async () => {
    const args = {
      values: { slug: "web" },
      locale: "en",
      payloadLocale: "en",
      keyphrases: [],
      fields: {},
      site: { name: "S", baseUrl: "" },
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await buildAnalysisInput({ ...args, previewPath: () => null })).path).toBeUndefined();
    expect(
      (
        await buildAnalysisInput({
          ...args,
          previewPath: () => {
            throw new Error("boom");
          },
        })
      ).path
    ).toBeUndefined();
    errors.mockRestore();
  });

  it("serializes the extractor's IR into contentHtml and sets has.content", async () => {
    const extractor: ContentExtractor = vi.fn(
      async (): Promise<ContentNode[]> => [{ type: "heading", level: 1, text: "Reg" }]
    );
    const out = await buildAnalysisInput({
      values: {},
      locale: "en",
      payloadLocale: "en",
      apiRoute: "/api",
      keyphrases: [],
      fields: {},
      site: { name: "S", baseUrl: "" },
      extractor,
    });
    expect(extractor).toHaveBeenCalledOnce();
    expect(out.contentHtml).toBe("<h1>Reg</h1>");
    expect(out.has.content).toBe(true);
  });

  it("invokes the extractor with raw values, ctx, and a toolkit (resolveDocs + helpers)", async () => {
    let received: {
      values: unknown;
      ctx: unknown;
      toolkit: ExtractToolkit;
    } | null = null;
    const extractor: ContentExtractor = async (values, ctx, toolkit) => {
      received = { values, ctx, toolkit };
      return [{ type: "paragraph", text: "ok" }];
    };
    await buildAnalysisInput({
      values: { a: 1 },
      locale: "es",
      payloadLocale: "es",
      apiRoute: "/api",
      keyphrases: [],
      fields: {},
      site: { name: "S", baseUrl: "" },
      extractor,
    });
    expect(received!.values).toEqual({ a: 1 });
    expect(received!.ctx).toEqual({ locale: "es", apiRoute: "/api" });
    expect(typeof received!.toolkit.resolveDocs).toBe("function");
    expect(typeof received!.toolkit.helpers.heading).toBe("function");
    expect(typeof received!.toolkit.helpers.compact).toBe("function");
  });
});
