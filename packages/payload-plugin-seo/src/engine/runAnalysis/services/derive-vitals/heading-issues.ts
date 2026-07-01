import type { HeadingDocIssue, HeadingLevel, HeadingNodeIssue } from "../../../types/analysis";
import type { FlatHeading } from "./heading-tree";

export interface HeadingIssues {
  docIssues: HeadingDocIssue[];
  nodeIssues: (HeadingNodeIssue | undefined)[];
}

export function deriveHeadingIssues(flat: FlatHeading[]): HeadingIssues {
  return {
    docIssues: deriveDocIssues(flat),
    nodeIssues: flat.map((_heading, index) => deriveNodeIssue(flat, index)),
  };
}

function deriveDocIssues(flat: FlatHeading[]): HeadingDocIssue[] {
  const h1Count = flat.filter((heading) => heading.level === 1).length;

  if (h1Count === 0) return [{ type: "missing-h1" }];
  if (h1Count > 1) return [{ type: "multiple-h1", count: h1Count }];

  return [];
}

function deriveNodeIssue(flat: FlatHeading[], index: number): HeadingNodeIssue | undefined {
  const current = flat[index];
  const previous = flat[index - 1];
  if (!current || !previous) return undefined;

  if (current.level - previous.level <= 1) return undefined;

  return {
    type: "skipped-level",
    skipped: levelsBetween(previous.level, current.level),
  };
}

function levelsBetween(from: HeadingLevel, to: HeadingLevel): HeadingLevel[] {
  const skipped: HeadingLevel[] = [];

  for (let level = from + 1; level < to; level++) {
    skipped.push(level as HeadingLevel);
  }

  return skipped;
}
