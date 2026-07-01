import type { HeadingNode } from "../../../../../engine/types/analysis";

export function collectParentIds(nodes: HeadingNode[]): string[] {
  const ids: string[] = [];

  const walk = (ns: HeadingNode[]) => {
    for (const n of ns) {
      if (n.children.length > 0) {
        ids.push(n.id);
        walk(n.children);
      }
    }
  };

  walk(nodes);

  return ids;
}

export function countHeadingWarnings(nodes: HeadingNode[]): number {
  let count = 0;

  const walk = (ns: HeadingNode[]) => {
    for (const n of ns) {
      if (n.issue) count++;
      walk(n.children);
    }
  };

  walk(nodes);

  return count;
}
