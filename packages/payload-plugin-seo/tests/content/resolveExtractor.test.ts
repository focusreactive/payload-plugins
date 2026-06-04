import { describe, expect, it, vi } from "vitest";
import { resolveExtractor } from "../../src/content/resolveExtractor";

describe("resolveExtractor", () => {
  it("returns the default extractor when no override is given", () => {
    const fn = resolveExtractor(undefined, { content: "sections" });
    const html = fn({ sections: [{ blockType: "copy", text: "Hi" }] });
    expect(html).toContain("<p>Hi</p>");
  });

  it("uses the override and ignores field paths", () => {
    const override = vi.fn(() => "<p>custom</p>");
    const fn = resolveExtractor(override, { content: "sections" });
    expect(fn({ anything: true })).toBe("<p>custom</p>");
    expect(override).toHaveBeenCalledOnce();
  });
});
