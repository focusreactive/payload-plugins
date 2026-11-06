import { describe, expect, it } from "vitest";
import { TRUNCATED_MARKER } from "../../src/constants";
import { createdPaths, diffPaths } from "../../src/core/diffPaths";

const rt = (text: string) => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", text },
          { type: "text", text },
        ],
      },
    ],
  },
});

describe("diffPaths", () => {
  it("ignores the ids of array and block rows at any depth", () => {
    const hero = { id: "r1", blockType: "hero", title: "A" };
    const cta = { id: "r2", blockType: "cta", label: "Go" };
    const inserted = { id: "r3", blockType: "hero", title: "A" };
    expect(diffPaths({ blocks: [hero, cta] }, { blocks: [inserted, hero, cta] })).toEqual([
      "blocks.1.blockType",
      "blocks.1.label",
      "blocks.1.title",
      "blocks.2",
    ]);
    expect(
      diffPaths(
        { tabs: { rows: [{ id: "a", items: [{ id: "x", v: 1 }] }] } },
        { tabs: { rows: [{ id: "b", items: [{ id: "y", v: 1 }] }] } }
      )
    ).toEqual([]);
  });

  it("still reports changed row content and a changed id outside rows", () => {
    expect(
      diffPaths(
        { list: [{ id: "a", v: 1 }], meta: { id: 1 } },
        { list: [{ id: "b", v: 2 }], meta: { id: 2 } }
      )
    ).toEqual(["list.0.v", "meta.id"]);
  });

  it("lists changed leaf paths and ignores timestamps", () => {
    const before = { id: 1, title: "A", seo: { title: "x", desc: "d" }, updatedAt: "1" };
    const after = { id: 1, title: "B", seo: { title: "y", desc: "d" }, updatedAt: "2" };
    expect(diffPaths(before, after)).toEqual(["title", "seo.title"]);
  });

  it("handles arrays and blocks by index", () => {
    const before = { sections: [{ id: "a", heading: "H" }] };
    const after = {
      sections: [
        { id: "a", heading: "H2" },
        { id: "b", heading: "N" },
      ],
    };
    expect(diffPaths(before, after)).toEqual(["sections.0.heading", "sections.1"]);
  });

  it("returns [] for equal docs", () => {
    expect(diffPaths({ a: { b: 1 } }, { a: { b: 1 } })).toEqual([]);
  });

  it("cuts the list at max and appends the truncation marker", () => {
    const before = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`f${i}`, 0]));
    const after = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`f${i}`, 1]));
    expect(diffPaths(before, after, { max: 3 })).toEqual(["f0", "f1", "f2", TRUNCATED_MARKER]);
  });

  it("does not add the marker when the diff fits exactly", () => {
    expect(diffPaths({ a: 1, b: 1 }, { a: 2, b: 2 }, { max: 2 })).toEqual(["a", "b"]);
  });

  it("treats a populated relation as equal to its id", () => {
    expect(diffPaths({ author: 5 }, { author: { id: 5, name: "N" } })).toEqual([]);
    expect(diffPaths({ author: { id: "a1", name: "N" } }, { author: "a1" })).toEqual([]);
  });

  it("treats populated hasMany relations as equal to their ids", () => {
    expect(diffPaths({ tags: [1, 2] }, { tags: [{ id: 1 }, { id: 2, t: "x" }] })).toEqual([]);
  });

  it("treats populated polymorphic relations as equal to their ids", () => {
    const before = {
      link: { relationTo: "pages", value: 3 },
      many: [{ relationTo: "posts", value: 4 }],
    };
    const after = {
      link: { relationTo: "pages", value: { id: 3, title: "P" } },
      many: [{ relationTo: "posts", value: { id: 4 } }],
    };
    expect(diffPaths(before, after)).toEqual([]);
  });

  it("reports a changed relation", () => {
    expect(diffPaths({ author: 5 }, { author: { id: 6 } })).toEqual(["author"]);
    expect(diffPaths({ tags: [1, 2] }, { tags: [{ id: 1 }, { id: 3 }] })).toEqual(["tags.1"]);
    expect(
      diffPaths(
        { link: { relationTo: "pages", value: 3 } },
        { link: { relationTo: "posts", value: { id: 3 } } }
      )
    ).toEqual(["link.relationTo"]);
  });

  it("still reports changes inside array rows that share an id", () => {
    const before = { rows: [{ id: "r1", text: "a" }] };
    const after = { rows: [{ id: "r1", text: "b" }] };
    expect(diffPaths(before, after)).toEqual(["rows.0.text"]);
  });

  it("reports a Lexical rich text field once", () => {
    expect(diffPaths({ body: rt("a") }, { body: rt("b") })).toEqual(["body"]);
    expect(diffPaths({ body: rt("a") }, { body: rt("a") })).toEqual([]);
    expect(diffPaths({ body: null }, { body: rt("a") })).toEqual(["body"]);
  });

  it("does not report a field that was never set and still has no value", () => {
    expect(
      diffPaths({}, { headline: "h", footer: null, seo: { description: null }, list: [] })
    ).toEqual(["headline"]);
    expect(diffPaths({ footer: null }, {})).toEqual([]);
  });

  it("still reports an empty string written where there was no value", () => {
    expect(diffPaths({}, { footer: "" })).toEqual(["footer"]);
    expect(diffPaths({ footer: null }, { footer: "" })).toEqual(["footer"]);
  });

  it("createdPaths lists top-level fields with a value", () => {
    expect(createdPaths({ id: 1, title: "A", empty: null, createdAt: "x" })).toEqual(["title"]);
  });

  it("createdPaths skips groups and arrays nobody filled in", () => {
    expect(
      createdPaths({ title: "A", seo: { description: null }, list: [], meta: { tags: ["x"] } })
    ).toEqual(["title", "meta"]);
  });
});
