import { describe, expect, it } from "vitest";
import { walkValue } from "../../src/content/walk/walkValue";

describe("walkValue", () => {
  it("strings become paragraph nodes", () => {
    expect(walkValue("Hello")).toEqual([{ type: "paragraph", text: "Hello" }]);
    expect(walkValue("   ")).toEqual([]);
  });
  it("lexical becomes an html node", () => {
    const lex = { root: { children: [{ type: "paragraph", children: [{ type: "text", text: "Hi" }] }] } };
    const out = walkValue(lex);
    expect(out[0]?.type).toBe("html");
  });
  it("image-shaped objects become image nodes", () => {
    const out = walkValue({ url: "/a.png", mimeType: "image/png", alt: "Alt" });
    expect(out).toEqual([{ type: "image", src: "/a.png", alt: "Alt" }]);
  });
  it("link-shaped objects become link nodes", () => {
    const out = walkValue({ url: "/x", label: "Go" });
    expect(out).toEqual([{ type: "link", href: "/x", text: "Go" }]);
  });
  it("recurses arrays and objects, skipping structural keys", () => {
    const out = walkValue([
      { blockType: "copy", text: "A" },
      { id: "1", text: "B" },
    ]);
    expect(out).toEqual([
      { type: "paragraph", text: "A" },
      { type: "paragraph", text: "B" },
    ]);
  });
  it("skips excluded dot-paths", () => {
    const data = { meta: { description: "SKIP" }, body: "KEEP" };
    const out = walkValue(data, { excluded: new Set(["meta.description"]), path: "" });
    expect(out).toEqual([{ type: "paragraph", text: "KEEP" }]);
  });
});
