import type { VeEditorState } from "../../shared/protocol.js";

import { rootOf } from "../../shared/richText/editorNodes.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { withRelatedDocumentsAsIds } from "./relatedIds.js";

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

const asJson = (posted: unknown): string | null => {
  try {
    return JSON.stringify(posted) ?? null;
  } catch {
    return null;
  }
};

export const readPostedEditorState = (posted: unknown, maxLength: number): VeEditorState | null => {
  const json = asJson(posted);
  if (json === null || json.length > maxLength) return null;

  const state: unknown = JSON.parse(json);
  const root = rootOf(state);
  if (!root || !isNestedWithin(state, MAX_EDITOR_STATE_NESTING)) return null;
  return root.type === ROOT_NODE_TYPE && isNodeTree(root)
    ? withRelatedDocumentsAsIds(state as VeEditorState)
    : null;
};
