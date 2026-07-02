import { describe, expect, it } from "vitest";
import { deriveHeadingIssues } from "../src/engine/runAnalysis/services/derive-vitals/heading-issues";
import type { FlatHeading } from "../src/engine/runAnalysis/services/derive-vitals/heading-tree";

const h = (level: FlatHeading["level"], text = ""): FlatHeading => ({ level, text });

describe("deriveHeadingIssues — document-level", () => {
  it("flags missing H1 when no H1 is present", () => {
    const { docIssues } = deriveHeadingIssues([h(2), h(3)]);
    expect(docIssues).toEqual([{ type: "missing-h1" }]);
  });

  it("flags multiple H1 with the count when 2+ H1 are present", () => {
    const { docIssues } = deriveHeadingIssues([h(1), h(2), h(1)]);
    expect(docIssues).toEqual([{ type: "multiple-h1", count: 2 }]);
  });

  it("reports no document issue for exactly one H1", () => {
    const { docIssues } = deriveHeadingIssues([h(1), h(2)]);
    expect(docIssues).toEqual([]);
  });
});

describe("deriveHeadingIssues — skipped levels", () => {
  it("flags a single skipped level against the immediately preceding heading", () => {
    // h2, h4, h3 -> only h4 is flagged (skipped h3); h3 goes back up, allowed
    const { nodeIssues } = deriveHeadingIssues([h(2), h(4), h(3)]);
    expect(nodeIssues).toEqual([undefined, { type: "skipped-level", skipped: [3] }, undefined]);
  });

  it("enumerates every skipped level across a multi-level jump", () => {
    // h2, h5 -> skipped h3 and h4
    const { nodeIssues } = deriveHeadingIssues([h(2), h(5)]);
    expect(nodeIssues).toEqual([undefined, { type: "skipped-level", skipped: [3, 4] }]);
  });

  it("never flags the first heading regardless of its level", () => {
    // h4, h6 -> first h4 has no predecessor; only h6 is flagged (skipped h5)
    const { nodeIssues } = deriveHeadingIssues([h(4), h(6)]);
    expect(nodeIssues).toEqual([undefined, { type: "skipped-level", skipped: [5] }]);
  });

  it("does not flag jumping back up multiple levels", () => {
    // h2, h3, h4, h2 -> the trailing h2 jumps up, which is allowed
    const { nodeIssues } = deriveHeadingIssues([h(2), h(3), h(4), h(2)]);
    expect(nodeIssues[3]).toBeUndefined();
  });

  it("treats a valid contiguous nested structure as issue-free", () => {
    const { nodeIssues } = deriveHeadingIssues([h(1), h(2), h(3), h(2), h(3)]);
    expect(nodeIssues.every((issue) => issue === undefined)).toBe(true);
  });
});
