import { describe, expect, it, vi } from "vitest";
import { buildAnalysisInput } from "../../src/components/SeoDrawer/build-analysis-input";
import type { ContentExtractor } from "../../src/types/config";

describe("buildAnalysisInput", () => {
  it("returns empty content when no extractor is provided", async () => {
    const out = await buildAnalysisInput({
      values: { title: "T" },
      locale: "en",
      payloadLocale: "en",
      apiRoute: "/api",
      keyphrase: "k",
      fields: { seoTitle: "title" },
      site: { name: "S", baseUrl: "https://x.com" },
    });
    expect(out.contentHtml).toBe("");
    expect(out.has.content).toBe(false);
  });

  it("serializes the extractor's IR into contentHtml and sets has.content", async () => {
    const extractor: ContentExtractor = vi.fn(async () => [
      { type: "heading", level: 1, text: "Reg" },
    ]);
    const out = await buildAnalysisInput({
      values: {},
      locale: "en",
      payloadLocale: "en",
      apiRoute: "/api",
      keyphrase: "",
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
      toolkit: { resolveDocs: unknown; helpers: Record<string, unknown> };
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
      keyphrase: "",
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
