import type { EditorNode } from "./editorNodes.js";

import { FIELD_PATH_SEPARATOR } from "../fieldKey.js";
import { childrenOf, rootOf } from "./editorNodes.js";
import { TEXT_NODE_TYPES } from "./nodeTypes.js";

export type TextLeaf = { address: string; text: string };

type TextNode = EditorNode & { text: string };

export const isTextLeaf = (node: EditorNode): node is TextNode =>
  TEXT_NODE_TYPES.has(node.type) && typeof node.text === "string";

export const addressOf = (indexes: readonly number[]): string => indexes.join(FIELD_PATH_SEPARATOR);

type VisitTextLeaf = (leaf: TextNode, indexes: readonly number[]) => void;

const visitTextLeaves = (node: EditorNode, indexes: readonly number[], visit: VisitTextLeaf) => {
  if (isTextLeaf(node)) {
    visit(node, indexes);
    return;
  }
  for (const [index, child] of childrenOf(node).entries()) {
    visitTextLeaves(child, [...indexes, index], visit);
  }
};

export const forEachTextLeaf = (root: EditorNode, visit: VisitTextLeaf): void =>
  visitTextLeaves(root, [], visit);

export const textLeavesOf = (editorState: unknown): TextLeaf[] => {
  const root = rootOf(editorState);
  if (!root) return [];
  const leaves: TextLeaf[] = [];
  forEachTextLeaf(root, (leaf, indexes) => {
    leaves.push({ address: addressOf(indexes), text: leaf.text });
  });
  return leaves;
};
