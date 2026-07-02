import { describe, expect, it } from "vitest";

// RED until implemented. `IdPath` is the stable, location-based identity of a translatable leaf
// (slice 6 design). The grammar lives ENTIRELY in makeIdPath — array/blocks indices are replaced
// by element `id` (+ blockType for blocks); names/leaves stay as names; no id → positional
// fallback. This is the sole constructor, so the grammar can't drift.
import type { IdPath } from "./idPath";
import { elementSegment, makeIdPath } from "./idPath";

describe("makeIdPath — grammar", () => {
  it("joins name segments with '.'", () => {
    expect(makeIdPath([{ kind: "key", name: "title" }])).toBe("title");
    expect(
      makeIdPath([
        { kind: "key", name: "hero" },
        { kind: "key", name: "heading" },
      ])
    ).toBe("hero.heading");
  });

  it("uses the element id (not index) for an array element", () => {
    expect(
      makeIdPath([
        { kind: "key", name: "items" },
        { kind: "element", id: "e1" },
        { kind: "key", name: "label" },
      ])
    ).toBe("items.e1.label");
  });

  it("folds blockType into a blocks element segment as <id>:<blockType>", () => {
    expect(
      makeIdPath([
        { kind: "key", name: "content" },
        { kind: "element", id: "b1", blockType: "hero" },
        { kind: "key", name: "heading" },
      ])
    ).toBe("content.b1:hero.heading");
  });

  it("falls back to a marked positional segment when there is no id", () => {
    expect(
      makeIdPath([
        { kind: "key", name: "content" },
        { kind: "index", index: 0 },
        { kind: "key", name: "heading" },
      ])
    ).toBe("content.#0.heading");
  });

  it("escapes the separator and ':' inside names/ids so they can't split the path", () => {
    // a dotted field name must not create extra segments
    expect(makeIdPath([{ kind: "key", name: "a.b" }])).toBe("a\\.b");
    // a colon inside an id must not be read as a blockType boundary
    expect(makeIdPath([{ kind: "element", id: "x:y" }])).toBe("x\\:y");
  });

  it("escapes '#' inside names/ids so a real id can't collide with the no-id positional fallback", () => {
    // an element whose real id is the literal string "#0" must not render identically to the
    // no-id fallback for index 0
    const withRealId = makeIdPath([{ kind: "element", id: "#0" }]);
    const withFallback = makeIdPath([{ kind: "index", index: 0 }]);
    expect(withRealId).toBe("\\#0");
    expect(withFallback).toBe("#0");
    expect(withRealId).not.toBe(withFallback);
  });

  it("is deterministic and location-based: same segments → same path", () => {
    const build = () =>
      makeIdPath([
        { kind: "key", name: "content" },
        { kind: "element", id: "b1", blockType: "hero" },
        { kind: "key", name: "heading" },
      ]);
    expect(build()).toBe(build());
  });

  it("distinguishes different locations even when the leaf name is identical", () => {
    const a = makeIdPath([
      { kind: "key", name: "hero" },
      { kind: "key", name: "title" },
    ]);
    const b = makeIdPath([
      { kind: "key", name: "footer" },
      { kind: "key", name: "title" },
    ]);
    expect(a).not.toBe(b);
  });
});

describe("elementSegment — builder from a data item", () => {
  it("array element → element segment by id", () => {
    expect(elementSegment({ id: "e1" }, false, 3)).toEqual({ kind: "element", id: "e1" });
  });

  it("blocks element → element segment with blockType", () => {
    expect(elementSegment({ id: "b1", blockType: "hero" }, true, 3)).toEqual({
      kind: "element",
      id: "b1",
      blockType: "hero",
    });
  });

  it("blocks element without a blockType string → id only", () => {
    expect(elementSegment({ id: "b1" }, true, 3)).toEqual({ kind: "element", id: "b1" });
  });

  it("no id → positional index fallback", () => {
    expect(elementSegment({}, false, 3)).toEqual({ kind: "index", index: 3 });
    expect(elementSegment({ id: null }, true, 5)).toEqual({ kind: "index", index: 5 });
  });

  it("coerces a numeric id to string", () => {
    expect(elementSegment({ id: 42 }, false, 0)).toEqual({ kind: "element", id: "42" });
  });
});

describe("IdPath — branded type", () => {
  it("is usable as a string, but a bare string is not assignable back to IdPath", () => {
    const p: IdPath = makeIdPath([{ kind: "key", name: "title" }]);
    const s: string = p; // IdPath widens to string
    expect(s).toBe("title");
    // @ts-expect-error a bare string cannot be used where an IdPath is required (sole constructor)
    const q: IdPath = "title";
    expect(q).toBe("title");
  });
});
