import { describe, expect, it } from "vitest";
import { article, articleSchema } from "./fixtures/documents.js";
import { collect } from "./fixtures/harness.js";

describe("a schema-outside language", () => {
  it("collects every selected leaf, in document order", () => {
    const targets = collect({ fields: articleSchema, source: article(), target: article() });

    expect(targets.map((target) => target.text)).toEqual([
      "Hello",
      "Kicker",
      "Caption",
      "Hi",
      "Quote",
      "Author",
    ]);
  });

  it("addresses each leaf by the segments its language contributed", () => {
    const targets = collect({ fields: articleSchema, source: article(), target: article() });

    expect(targets.map((target) => target.idPath)).toEqual([
      ["title"],
      ["kicker"],
      ["meta", "caption"],
      ["sections", "a", "heading"],
      ["sections", "b", "quote"],
      ["sections", "b", "author"],
    ]);
  });

  it("leaves out what the language does not select", () => {
    const texts = collect({ fields: articleSchema, source: article(), target: article() }).map(
      (target) => target.text
    );

    expect(texts).toContain("Hello");
    expect(texts).not.toContain("hello");
    expect(texts).not.toContain("do not send");
  });
});
