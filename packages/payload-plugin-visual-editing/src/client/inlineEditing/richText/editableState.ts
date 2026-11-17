import type { VeEditorState } from "../../../shared/protocol.js";
import type { EditorNode } from "../../../shared/richText/editorNodes.js";

import { isPlainObject } from "../../../shared/plainObject.js";
import { mapEditorNodes } from "../../../shared/richText/editorNodes.js";

export const OPAQUE_NODE_TYPE = "ve-opaque";

export const OPAQUE_NODE_VERSION = 1;

export type OpaqueNodeJson = {
  type: typeof OPAQUE_NODE_TYPE;
  version: typeof OPAQUE_NODE_VERSION;
  isInline: boolean;
  kept: EditorNode;
};

const ROOT_NODE_TYPE = "root";

const EDITABLE_NODE_TYPES: ReadonlySet<unknown> = new Set([
  ROOT_NODE_TYPE,
  "paragraph",
  "heading",
  "quote",
  "list",
  "listitem",
  "link",
  "autolink",
  "linebreak",
  "text",
  "tab",
]);

const opaqueOf = (kept: EditorNode, parent: EditorNode | null): EditorNode => ({
  isInline: parent !== null && parent.type !== ROOT_NODE_TYPE,
  kept,
  type: OPAQUE_NODE_TYPE,
  version: OPAQUE_NODE_VERSION,
});

const keptOf = (node: EditorNode): EditorNode =>
  node.type === OPAQUE_NODE_TYPE && isPlainObject(node.kept) ? node.kept : node;

export const stateForEditor = (state: VeEditorState): VeEditorState => ({
  ...state,
  root: mapEditorNodes(state.root, (node, parent) =>
    EDITABLE_NODE_TYPES.has(node.type) ? node : opaqueOf(node, parent)
  ),
});

export const stateOfEditor = (state: VeEditorState): VeEditorState => ({
  ...state,
  root: mapEditorNodes(state.root, keptOf),
});
