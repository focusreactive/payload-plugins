import { describe, expect, it } from "vitest";
import {
  heading,
  paragraph,
  link,
  image,
  video,
  richText,
  html,
  compact,
} from "../../../src/content/schema/helpers";

describe("content helpers", () => {
  it("heading: builds or returns null on empty", () => {
    expect(heading(2, "Pricing")).toEqual({ type: "heading", level: 2, text: "Pricing" });
    expect(heading(1, "  ")).toBeNull();
    expect(heading(3, undefined)).toBeNull();
  });
  it("paragraph", () => {
    expect(paragraph("Hello")).toEqual({ type: "paragraph", text: "Hello" });
    expect(paragraph("")).toBeNull();
  });
  it("link requires href and text", () => {
    expect(link("/x", "Go")).toEqual({ type: "link", href: "/x", text: "Go" });
    expect(link("/x", "")).toBeNull();
    expect(link("", "Go")).toBeNull();
  });
  it("image requires src; alt optional", () => {
    expect(image("/a.png", "Alt")).toEqual({ type: "image", src: "/a.png", alt: "Alt" });
    expect(image("/a.png")).toEqual({ type: "image", src: "/a.png", alt: "" });
    expect(image(undefined)).toBeNull();
  });
  it("video requires src", () => {
    expect(video("/v.mp4", "/p.png")).toEqual({ type: "video", src: "/v.mp4", poster: "/p.png" });
    expect(video(null)).toBeNull();
  });
  it("richText converts lexical, null when empty", () => {
    const lex = {
      root: {
        type: "root",
        children: [{ type: "paragraph", children: [{ type: "text", text: "Hi" }] }],
      },
    };
    const node = richText(lex);
    expect(node?.type).toBe("html");
    expect((node as { html: string }).html).toContain("Hi");
    expect(richText(null)).toBeNull();
    expect(richText({ root: { children: [] } })).toBeNull();
  });
  it("html passes through, null when empty", () => {
    expect(html("<p>x</p>")).toEqual({ type: "html", html: "<p>x</p>" });
    expect(html("   ")).toBeNull();
  });
  it("compact drops null/undefined and keeps nodes in order", () => {
    expect(
      compact([
        { type: "paragraph", text: "a" },
        null,
        undefined,
        { type: "heading", level: 2, text: "b" },
      ])
    ).toEqual([
      { type: "paragraph", text: "a" },
      { type: "heading", level: 2, text: "b" },
    ]);
    expect(compact([])).toEqual([]);
  });
});
