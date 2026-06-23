// tests/content/schema/serialize.test.ts
import { describe, expect, it } from "vitest";
import { serialize } from "../../../src/content/schema/serialize";

describe("serialize", () => {
  it("emits each node type", () => {
    const html = serialize([
      { type: "heading", level: 1, text: "Title" },
      { type: "paragraph", text: "Body" },
      { type: "link", href: "/x", text: "Go" },
      { type: "image", src: "/a.png", alt: "Alt" },
      { type: "video", src: "/v.mp4", poster: "/p.png" },
      { type: "html", html: "<ul><li>x</li></ul>" },
    ]);
    expect(html).toBe(["<h1>Title</h1>", "<p>Body</p>", '<a href="/x">Go</a>', '<img src="/a.png" alt="Alt" />', '<video src="/v.mp4" poster="/p.png"></video>', "<ul><li>x</li></ul>"].join("\n"));
  });
  it("escapes text and attributes", () => {
    expect(serialize([{ type: "paragraph", text: "a < b & c" }])).toBe("<p>a &lt; b &amp; c</p>");
    expect(serialize([{ type: "link", href: '/x"y', text: "<z>" }])).toBe('<a href="/x&quot;y">&lt;z&gt;</a>');
    expect(serialize([{ type: "image", src: "/a.png", alt: 'q"q' }])).toBe('<img src="/a.png" alt="q&quot;q" />');
  });
  it("omits image alt attr value safely and video poster when absent", () => {
    expect(serialize([{ type: "image", src: "/a.png", alt: "" }])).toBe('<img src="/a.png" alt="" />');
    expect(serialize([{ type: "video", src: "/v.mp4" }])).toBe('<video src="/v.mp4"></video>');
  });
  it("joins with newlines and ignores nothing extra", () => {
    expect(serialize([])).toBe("");
  });
});
