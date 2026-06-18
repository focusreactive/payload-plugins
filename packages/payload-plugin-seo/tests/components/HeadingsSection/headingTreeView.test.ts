import { describe, expect, it } from "vitest";
import { collectParentIds } from "../../../src/components/SeoDrawer/components/HeadingsSection/HeadingTree/headingTreeView";
import { buildHeadingTree } from "../../../src/engine/runAnalysis/services/derive-vitals/heading-tree";

const tree = buildHeadingTree([
  { level: 1, text: "root" },
  { level: 2, text: "a" },
  { level: 3, text: "a1" },
  { level: 2, text: "b" },
]).tree;

describe("headingTreeView", () => {
  it("collects ids of nodes with children", () => {
    expect(collectParentIds(tree)).toEqual(["0", "0.0"]);
  });
});
