import { describe, expect, it, vi } from "vitest";
import { registerContentExtractors } from "../../src/content/registry";
import { buildAnalysisInput } from "../../src/components/SeoDrawer/build-analysis-input";

// This test asserts the wiring contract: a registered extractor, when passed as override,
// produces serialized Intermediate Representation. (useLiveDocument is a hook; its getInput delegates to buildAnalysisInput
// with override = resolveContentExtractor(extractContentPath).)
describe("extractContentPath → override contract", () => {
  it("a registered extractor's Intermediate Representation is serialized into contentHtml", async () => {
    const fn = vi.fn(async () => [{ type: "heading" as const, level: 1 as const, text: "Reg" }]);
    registerContentExtractors({ "@/x#default": fn });
    const { resolveContentExtractor } = await import("../../src/content/registry");
    const override = resolveContentExtractor("@/x#default");
    const input = await buildAnalysisInput({
      values: {},
      locale: "en",
      payloadLocale: "en",
      keyphrase: "",
      fields: { content: "blocks" },
      site: { name: "S", baseUrl: "" },
      schemaFields: [],
      walkCtx: { isUploadCollection: () => false, blocksBySlug: {} },
      resolver: { resolve: vi.fn(async () => new Map()), invalidate: vi.fn() } as never,
      override,
    });
    expect(fn).toHaveBeenCalledOnce();
    expect(input.contentHtml).toBe("<h1>Reg</h1>");
  });
});
