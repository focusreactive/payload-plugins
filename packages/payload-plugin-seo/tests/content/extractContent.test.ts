import { describe, expect, it } from "vitest";
import { extractContent } from "../../src/content/extractContent";

describe("extractContent", () => {
  it("string content path (back-compat): walks one field", () => {
    const ir = extractContent({ sections: [{ blockType: "copy", text: "Hello world" }] }, { content: "sections" });
    expect(ir).toEqual([{ type: "paragraph", text: "Hello world" }]);
  });
  it("returns [] when content is undefined", () => {
    expect(extractContent({ sections: [{ text: "x" }] }, {})).toEqual([]);
  });
  it("include array walks each path in order", () => {
    const ir = extractContent({ a: "A", b: "B" }, { content: { include: ["b", "a"] } });
    expect(ir).toEqual([
      { type: "paragraph", text: "B" },
      { type: "paragraph", text: "A" },
    ]);
  });
  it("empty selection walks the whole document", () => {
    const ir = extractContent({ a: "A", nested: { b: "B" } }, { content: {} });
    expect(ir).toEqual([
      { type: "paragraph", text: "A" },
      { type: "paragraph", text: "B" },
    ]);
  });
  it("auto-excludes the configured metadata paths in whole-doc mode", () => {
    const data = { meta: { title: "T", description: "D" }, slug: "s", body: "KEEP" };
    const ir = extractContent(data, { content: {}, seoTitle: "meta.title", metaDescription: "meta.description", slug: "slug" });
    expect(ir).toEqual([{ type: "paragraph", text: "KEEP" }]);
  });
  it("honors user-provided exclude", () => {
    const ir = extractContent({ a: "A", b: "B" }, { content: { exclude: ["b"] } });
    expect(ir).toEqual([{ type: "paragraph", text: "A" }]);
  });
});
