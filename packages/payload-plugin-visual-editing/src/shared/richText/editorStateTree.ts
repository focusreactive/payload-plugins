import type { VeEditorState } from "../protocol.js";

import { isPlainObject } from "../plainObject.js";
import { rootOf } from "./editorNodes.js";

const MAX_EDITOR_STATE_NESTING = 256;

const ROOT_NODE_TYPE = "root";

type Nested = { nesting: number; value: unknown };

const isNestedWithin = (posted: unknown, maxNesting: number): boolean => {
  const pending: Nested[] = [{ nesting: 0, value: posted }];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const { nesting, value } = next;
    if (typeof value !== "object" || value === null) continue;
    if (nesting === maxNesting) return false;
    for (const child of Object.values(value)) pending.push({ nesting: nesting + 1, value: child });
  }
  return true;
};

const isNodeTree = (node: unknown): boolean => {
  if (!isPlainObject(node) || typeof node.type !== "string") return false;
  const { children } = node;
  return children === undefined || (Array.isArray(children) && children.every(isNodeTree));
};

export const isEditorStateTree = (state: unknown): state is VeEditorState => {
  const root = rootOf(state);
  if (!root || !isNestedWithin(state, MAX_EDITOR_STATE_NESTING)) return false;
  return root.type === ROOT_NODE_TYPE && isNodeTree(root);
};
