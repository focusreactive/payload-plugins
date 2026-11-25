import type { VeEditorState } from "../protocol.js";
import type { EditorNode } from "./editorNodes.js";

import { isPlainObject } from "../plainObject.js";
import { rootOf } from "./editorNodes.js";

export const ROOT_NODE_TYPE = "root";
export const PARAGRAPH_NODE_TYPE = "paragraph";
export const HEADING_NODE_TYPE = "heading";
export const QUOTE_NODE_TYPE = "quote";
export const LIST_NODE_TYPE = "list";
export const LIST_ITEM_NODE_TYPE = "listitem";
export const LINK_NODE_TYPE = "link";
export const AUTO_LINK_NODE_TYPE = "autolink";
export const LINE_BREAK_NODE_TYPE = "linebreak";
export const TEXT_NODE_TYPE = "text";
export const TAB_NODE_TYPE = "tab";

const EDITABLE_NODE_TYPES: ReadonlySet<unknown> = new Set([
  ROOT_NODE_TYPE,
  PARAGRAPH_NODE_TYPE,
  HEADING_NODE_TYPE,
  QUOTE_NODE_TYPE,
  LIST_NODE_TYPE,
  LIST_ITEM_NODE_TYPE,
  LINK_NODE_TYPE,
  AUTO_LINK_NODE_TYPE,
  LINE_BREAK_NODE_TYPE,
  TEXT_NODE_TYPE,
  TAB_NODE_TYPE,
]);

export type FixedNode = { node: EditorNode; parentType: unknown };

export type ReplaceFixedNode = (fixed: FixedNode, position: number) => EditorNode;

export const isEditableNode = (node: EditorNode): boolean => EDITABLE_NODE_TYPES.has(node.type);

export type MapEditableNode = (node: EditorNode) => EditorNode;

type Walk = { position: number; replace: ReplaceFixedNode; map: MapEditableNode };

const asItIs: MapEditableNode = (node) => node;

const keepFixedNode: ReplaceFixedNode = ({ node }) => node;

const walkedNode = (node: EditorNode, parentType: unknown, walk: Walk): EditorNode => {
  if (!isEditableNode(node)) {
    const replaced = walk.replace({ node, parentType }, walk.position);
    walk.position += 1;
    return replaced;
  }
  const mapped = walk.map(node);
  const { children } = mapped;
  if (!Array.isArray(children)) return mapped;
  return {
    ...mapped,
    children: children.map((child: unknown) =>
      isPlainObject(child) ? walkedNode(child, node.type, walk) : child
    ),
  };
};

const walkedState = (
  state: VeEditorState,
  replace: ReplaceFixedNode,
  map: MapEditableNode
): VeEditorState => {
  const root = rootOf(state);
  return root ? { ...state, root: walkedNode(root, null, { map, position: 0, replace }) } : state;
};

export const withFixedNodes = (state: VeEditorState, replace: ReplaceFixedNode): VeEditorState =>
  walkedState(state, replace, asItIs);

export const mapEditableNodes = (state: VeEditorState, map: MapEditableNode): VeEditorState =>
  walkedState(state, keepFixedNode, map);

export const fixedNodesOf = (state: unknown): FixedNode[] => {
  const fixedNodes: FixedNode[] = [];
  if (!isPlainObject(state)) return fixedNodes;
  withFixedNodes(state, (fixed) => {
    fixedNodes.push(fixed);
    return fixed.node;
  });
  return fixedNodes;
};

export const forEachEditableNode = (state: unknown, visit: (node: EditorNode) => void): void => {
  if (!isPlainObject(state)) return;
  mapEditableNodes(state, (node) => {
    visit(node);
    return node;
  });
};
