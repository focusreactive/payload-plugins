import type { VeEditorState } from "../protocol.js";
import type { PlainObject } from "../plainObject.js";
import type { EditorNode } from "./editorNodes.js";

import { isPlainObject } from "../plainObject.js";
import { BLOCK_NODE_TYPES } from "./nodeTypes.js";
import { forEachEditorNode, mapEditorNodes, rootOf } from "./editorNodes.js";

type BlockFields = PlainObject;

type FieldsOfBlock = (identity: BlockFields) => BlockFields;

const isBlockNode = (node: EditorNode): boolean => BLOCK_NODE_TYPES.has(node.type);

const identityOf = (fields: unknown): BlockFields => {
  if (!isPlainObject(fields)) return {};
  const { blockType, id } = fields;
  return { ...(blockType !== undefined && { blockType }), ...(id !== undefined && { id }) };
};

const mapBlockFields = (state: VeEditorState, fieldsOfBlock: FieldsOfBlock): VeEditorState => ({
  ...state,
  root: mapEditorNodes(state.root, (node) =>
    isBlockNode(node) ? { ...node, fields: fieldsOfBlock(identityOf(node.fields)) } : node
  ),
});

export const withoutBlockFields = (state: VeEditorState): VeEditorState =>
  mapBlockFields(state, (identity) => identity);

export const withBlockFieldsOf = (state: VeEditorState, stored: unknown): VeEditorState => {
  const storedFieldsById = new Map<string, BlockFields>();
  forEachEditorNode(rootOf(stored), (node) => {
    if (isBlockNode(node) && isPlainObject(node.fields) && node.fields.id !== undefined) {
      storedFieldsById.set(String(node.fields.id), node.fields);
    }
  });
  return mapBlockFields(state, (identity) => storedFieldsById.get(String(identity.id)) ?? identity);
};
