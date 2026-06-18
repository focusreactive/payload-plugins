import { describe, expect, it } from "vitest";
import { buildHeadingTree } from "../../../../src/engine/runAnalysis/services/derive-vitals/heading-tree";
import type { FlatHeading } from "../../../../src/engine/runAnalysis/services/derive-vitals/heading-tree";

const h = (level: 1 | 2 | 3 | 4 | 5 | 6, text: string): FlatHeading => ({ level, text });

describe("buildHeadingTree", () => {
  it("counts all six levels with zeros, in order", () => {
    const r = buildHeadingTree([h(1, "a"), h(2, "b"), h(2, "c")]);
    expect(r.levels).toEqual([
      { level: 1, count: 1 },
      { level: 2, count: 2 },
      { level: 3, count: 0 },
      { level: 4, count: 0 },
      { level: 5, count: 0 },
      { level: 6, count: 0 },
    ]);
    expect(r.total).toBe(3);
  });

  it("nests by relative level", () => {
    const r = buildHeadingTree([h(1, "root"), h(2, "child"), h(3, "grand")]);
    expect(r.tree).toHaveLength(1);
    expect(r.tree[0].children[0].children[0].text).toBe("grand");
  });

  it("compresses gaps (H2 then H4 is one nesting step)", () => {
    const r = buildHeadingTree([h(2, "parent"), h(4, "child")]);
    expect(r.tree).toHaveLength(1);
    expect(r.tree[0].level).toBe(2);
    expect(r.tree[0].children).toHaveLength(1);
    expect(r.tree[0].children[0].level).toBe(4);
  });

  it("treats a page starting at H2 as depth-0 roots", () => {
    const r = buildHeadingTree([h(2, "a"), h(2, "b")]);
    expect(r.tree.map((n) => n.text)).toEqual(["a", "b"]);
  });

  it("supports multiple H1 roots", () => {
    const r = buildHeadingTree([h(1, "first"), h(1, "second")]);
    expect(r.tree.map((n) => n.text)).toEqual(["first", "second"]);
  });

  it("assigns stable path ids", () => {
    const r = buildHeadingTree([h(1, "a"), h(2, "b"), h(2, "c")]);
    expect(r.tree[0].id).toBe("0");
    expect(r.tree[0].children[0].id).toBe("0.0");
    expect(r.tree[0].children[1].id).toBe("0.1");
  });

  it("returns empty structure for no headings", () => {
    const r = buildHeadingTree([]);
    expect(r.total).toBe(0);
    expect(r.tree).toEqual([]);
  });
});
