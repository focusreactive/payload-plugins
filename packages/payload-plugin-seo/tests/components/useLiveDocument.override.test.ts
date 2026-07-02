import { describe, expect, it, vi } from "vitest";
import { registerContentExtractors } from "../../src/content/registry";
import { buildAnalysisInput } from "../../src/components/SeoDrawer/build-analysis-input";

describe("registered extractor → analysis input", () => {
  it("a registered extractor's IR is serialized into contentHtml", async () => {
    const fn = vi.fn(async () => [{ type: "heading" as const, level: 1 as const, text: "Reg" }]);
    registerContentExtractors({ "@/x#default": fn });
    const { resolveContentExtractor } = await import("../../src/content/registry");
    const extractor = resolveContentExtractor("@/x#default");
    const input = await buildAnalysisInput({
      values: {},
      locale: "en",
      payloadLocale: "en",
      apiRoute: "/api",
      keyphrases: [],
      fields: {},
      site: { name: "S", baseUrl: "" },
      extractor,
    });
    expect(fn).toHaveBeenCalledOnce();
    expect(input.contentHtml).toBe("<h1>Reg</h1>");
  });
});
