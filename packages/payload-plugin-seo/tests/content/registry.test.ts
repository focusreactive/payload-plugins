import { describe, expect, it } from "vitest";
import { registerContentExtractors, resolveContentExtractor } from "../../src/content/registry";
import type { ContentNode } from "../../src/content/schema/nodes";

const sampleExtractor = async (): Promise<ContentNode[]> => [{ type: "paragraph", text: "x" }];
const emptyExtractor = async (): Promise<ContentNode[]> => [];

describe("content extractor registry", () => {
  it("registers and resolves by key", () => {
    registerContentExtractors({ "@/a#default": sampleExtractor });
    expect(resolveContentExtractor("@/a#default")).toBe(sampleExtractor);
  });
  it("returns undefined for unknown / empty keys", () => {
    expect(resolveContentExtractor("nope")).toBeUndefined();
    expect(resolveContentExtractor(null)).toBeUndefined();
    expect(resolveContentExtractor(undefined)).toBeUndefined();
  });
  it("shares one instance across module imports (globalThis-backed)", async () => {
    registerContentExtractors({ "@/b#default": emptyExtractor });
    const again = await import("../../src/content/index");
    expect(again.resolveContentExtractor?.("@/b#default") ?? resolveContentExtractor("@/b#default")).toBe(emptyExtractor);
  });
});
