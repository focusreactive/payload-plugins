import { describe, expect, it } from "vitest";
import { buildHeadingTree } from "../src/engine/runAnalysis/services/derive-vitals/heading-tree";
import type { FlatHeading } from "../src/engine/runAnalysis/services/derive-vitals/heading-tree";

const h = (level: FlatHeading["level"], text = ""): FlatHeading => ({ level, text });

describe("buildHeadingTree — issue integration", () => {
  it("surfaces document issues on the structure", () => {
    const structure = buildHeadingTree([h(2), h(3)]);
    expect(structure.issues).toEqual([{ type: "missing-h1" }]);
  });

  it("attaches the skipped-level issue to the offending node", () => {
    // h1 > h2 > h4 (h4 skipped h3)
    const structure = buildHeadingTree([h(1), h(2), h(4)]);
    const h4 = structure.tree[0]?.children[0]?.children[0];
    expect(h4?.issue).toEqual({ type: "skipped-level", skipped: [3] });
  });

  it("leaves nodes without gaps issue-free", () => {
    const structure = buildHeadingTree([h(1), h(2), h(3)]);
    expect(structure.tree[0]?.issue).toBeUndefined();
  });
});
