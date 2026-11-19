import type { VeEditorState } from "../../../shared/protocol.js";
import type { EditorNode } from "../../../shared/richText/editorNodes.js";

import { isPlainObject } from "../../../shared/plainObject.js";
import { ROOT_NODE_TYPE, withFixedNodes } from "../../../shared/richText/editableNodes.js";

export const OPAQUE_NODE_TYPE = "ve-opaque";

export const OPAQUE_NODE_VERSION = 1;

export type OpaqueNodeJson = {
  type: typeof OPAQUE_NODE_TYPE;
  version: typeof OPAQUE_NODE_VERSION;
  isInline: boolean;
  kept: EditorNode;
};

const keptOf = (node: EditorNode): EditorNode =>
  node.type === OPAQUE_NODE_TYPE && isPlainObject(node.kept) ? node.kept : node;

export const stateForEditor = (state: VeEditorState): VeEditorState =>
  withFixedNodes(state, ({ node, parentType }) => ({
    isInline: parentType !== ROOT_NODE_TYPE,
    kept: node,
    type: OPAQUE_NODE_TYPE,
    version: OPAQUE_NODE_VERSION,
  }));

export const stateOfEditor = (state: VeEditorState): VeEditorState =>
  withFixedNodes(state, ({ node }) => keptOf(node));
