import type { PlainObject } from "../plainObject.js";

import { isPlainObject } from "../plainObject.js";

export type EditorNode = PlainObject;

export const childrenOf = (node: EditorNode): EditorNode[] =>
  Array.isArray(node.children) ? node.children.filter(isPlainObject) : [];

export const rootOf = (editorState: unknown): EditorNode | null => {
  if (!isPlainObject(editorState) || !isPlainObject(editorState.root)) return null;
  return editorState.root;
};

export const mapEditorNodes = (node: unknown, map: (node: EditorNode) => EditorNode): unknown => {
  if (!isPlainObject(node)) return node;
  const { children } = node;
  return {
    ...map(node),
    ...(Array.isArray(children) && {
      children: children.map((child) => mapEditorNodes(child, map)),
    }),
  };
};

export const forEachEditorNode = (node: unknown, visit: (node: EditorNode) => void): void => {
  if (!isPlainObject(node)) return;
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) forEachEditorNode(child, visit);
  }
};
