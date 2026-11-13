import type { VeEditorState } from "../../shared/protocol.js";
import type { EditorNode } from "../../shared/richText/editorNodes.js";

import { LINK_NODE_TYPES, RELATED_VALUE_NODE_TYPES } from "../../shared/richText/nodeTypes.js";
import { mapEditorNodes } from "../../shared/richText/editorNodes.js";
import type { PlainObject } from "../../shared/plainObject.js";

import { idOf } from "../../shared/veDocument.js";
import { isPlainObject } from "../../shared/plainObject.js";

const withValueAsId = (holder: PlainObject): PlainObject =>
  isPlainObject(holder.value) ? { ...holder, value: idOf(holder.value.id) } : holder;

const withLinkedDocumentAsId = (node: EditorNode): EditorNode => {
  const { fields } = node;
  if (!isPlainObject(fields) || !isPlainObject(fields.doc)) return node;
  return { ...node, fields: { ...fields, doc: withValueAsId(fields.doc) } };
};

const withRelatedAsIds = (node: EditorNode): EditorNode => {
  if (RELATED_VALUE_NODE_TYPES.has(node.type)) return withValueAsId(node);
  if (LINK_NODE_TYPES.has(node.type)) return withLinkedDocumentAsId(node);
  return node;
};

export const withRelatedDocumentsAsIds = (state: VeEditorState): VeEditorState =>
  isPlainObject(state.root)
    ? { ...state, root: mapEditorNodes(state.root, withRelatedAsIds) }
    : state;
