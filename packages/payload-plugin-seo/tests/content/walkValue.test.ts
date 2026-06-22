import { describe, expect, it } from "vitest";
import { walkValue } from "../../src/content/walkValue";

describe("walkValue", () => {
  it("emits a text fragment for a string", () => {
    expect(walkValue("hello")).toEqual([{ kind: "text", value: "hello" }]);
  });

  it("detects a lexical value by its root key", () => {
    const lex = { root: { type: "root", children: [] } };
    expect(walkValue(lex)).toEqual([{ kind: "lexical", value: lex }]);
  });

  it("walks a blocks array in order, descending into block fields", () => {
    const blocks = [
      { blockType: "hero", title: "Big title", description: "Sub" },
      { blockType: "copy", text: "Body copy" },
    ];
    expect(walkValue(blocks)).toEqual([
      { kind: "text", value: "Big title" },
      { kind: "text", value: "Sub" },
      { kind: "text", value: "Body copy" },
    ]);
  });

  it("ignores non-content scalars (numbers, booleans, ids)", () => {
    const blocks = [{ blockType: "copy", id: "abc", order: 3, enabled: true, text: "Keep" }];
    expect(walkValue(blocks)).toEqual([{ kind: "text", value: "Keep" }]);
  });

  it("emits an anchor html fragment for a link-shaped object", () => {
    expect(walkValue({ id: "1", label: "running shoes", url: "https://shop.example/x" })).toEqual([
      { kind: "html", value: '<a href="https://shop.example/x">running shoes</a>' },
    ]);
  });

  it("emits an img html fragment for an image upload object (alt from the media doc)", () => {
    expect(
      walkValue({
        id: "m1",
        url: "/media/trail.jpg",
        mimeType: "image/jpeg",
        alt: "shoes on a trail",
      })
    ).toEqual([{ kind: "html", value: '<img src="/media/trail.jpg" alt="shoes on a trail" />' }]);
  });

  it("prefers image over link when a media object has both a url and a title", () => {
    expect(
      walkValue({
        id: "m2",
        url: "/media/p.png",
        mimeType: "image/png",
        title: "Pic",
        alt: "alt text",
      })
    ).toEqual([{ kind: "html", value: '<img src="/media/p.png" alt="alt text" />' }]);
  });

  it("escapes url and label/alt to keep the emitted html well-formed", () => {
    expect(walkValue({ url: 'https://x.example/a?b=1&c="2"', label: "<b>shoes</b>" })).toEqual([
      {
        kind: "html",
        value: '<a href="https://x.example/a?b=1&amp;c=&quot;2&quot;">&lt;b&gt;shoes&lt;/b&gt;</a>',
      },
    ]);
  });
});
