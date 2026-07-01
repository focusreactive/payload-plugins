import type {
  HeadingLevel,
  HeadingLevelCount,
  HeadingNode,
  HeadingStructure,
} from "../../../types/analysis";
import { deriveHeadingIssues } from "./heading-issues";

export interface FlatHeading {
  level: HeadingLevel;
  text: string;
}

const LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6];

function countLevels(flat: FlatHeading[]): HeadingLevelCount[] {
  return LEVELS.map((level) => ({
    level,
    count: flat.filter((h) => h.level === level).length,
  }));
}

export function buildHeadingTree(flat: FlatHeading[]): HeadingStructure {
  const { docIssues, nodeIssues } = deriveHeadingIssues(flat);
  const roots: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const [index, heading] of flat.entries()) {
    let top = stack.at(-1);

    while (top && top.level >= heading.level) {
      stack.pop();
      top = stack.at(-1);
    }

    const parent = top;
    const id = parent ? `${parent.id}.${parent.children.length}` : `${roots.length}`;

    const node: HeadingNode = {
      id,
      level: heading.level,
      text: heading.text,
      children: [],
      issue: nodeIssues[index],
    };
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
  }

  return {
    total: flat.length,
    levels: countLevels(flat),
    tree: roots,
    issues: docIssues,
  };
}
