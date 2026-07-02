import { describe, expect, it } from "vitest";
import { countHeadingWarnings } from "../src/components/SeoDrawer/components/HeadingsSection/HeadingTree/headingTreeView";
import { buildHeadingTree } from "../src/engine/runAnalysis/services/derive-vitals/heading-tree";
import type { FlatHeading } from "../src/engine/runAnalysis/services/derive-vitals/heading-tree";

const h = (level: FlatHeading["level"], text = ""): FlatHeading => ({ level, text });

describe("countHeadingWarnings", () => {
  it("counts every heading node carrying a skipped-level issue across the whole tree", () => {
    // h1 > h2 > h4 (skips h3); then h2 > h6 (skips h4,h5) -> 2 flagged, both nested
    const structure = buildHeadingTree([h(1), h(2), h(4), h(2), h(6)]);
    expect(countHeadingWarnings(structure.tree)).toBe(2);
  });

  it("returns 0 when no heading skips a level", () => {
    const structure = buildHeadingTree([h(1), h(2), h(3), h(2)]);
    expect(countHeadingWarnings(structure.tree)).toBe(0);
  });

  it("counts flagged nodes deep in the tree, not just roots", () => {
    const structure = buildHeadingTree([h(1), h(2), h(3), h(6)]);
    expect(countHeadingWarnings(structure.tree)).toBe(1);
  });
});
