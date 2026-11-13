import type { VeEditorState } from "../../shared/protocol.js";
import type { EditorNode } from "../../shared/richText/editorNodes.js";
import type { PlainObject } from "../../shared/plainObject.js";

import { LINK_NODE_TYPES, UPLOAD_NODE_TYPE } from "../../shared/richText/nodeTypes.js";
import { forEachEditorNode, mapEditorNodes, rootOf } from "../../shared/richText/editorNodes.js";
import { isPlainObject } from "../../shared/plainObject.js";

const TARGET_FIELDS_OF_A_LINK = ["doc", "linkType", "newTab", "url"];

type SavedFields = Map<string, PlainObject>;

const savedKeyOf = ({ id, type }: EditorNode): string | null =>
  typeof id === "string" && typeof type === "string" ? JSON.stringify([type, id]) : null;

const targetOf = (fields: unknown): PlainObject =>
  isPlainObject(fields)
    ? Object.fromEntries(
        TARGET_FIELDS_OF_A_LINK.filter((name) => Object.hasOwn(fields, name)).map((name) => [
          name,
          fields[name],
        ])
      )
    : {};

const fieldsOf = (node: EditorNode, saved: SavedFields): PlainObject | null | undefined => {
  const key = savedKeyOf(node);
  const savedFields = key === null ? undefined : saved.get(key);
  if (node.type === UPLOAD_NODE_TYPE) return savedFields ?? null;
  if (LINK_NODE_TYPES.has(node.type)) return { ...savedFields, ...targetOf(node.fields) };
  return undefined;
};

const withSavedFields = (node: EditorNode, saved: SavedFields): EditorNode => {
  const fields = fieldsOf(node, saved);
  return fields === undefined ? node : { ...node, fields };
};

export const withSavedNodeFieldsOf = (state: VeEditorState, stored: unknown): VeEditorState => {
  const saved: SavedFields = new Map();
  forEachEditorNode(rootOf(stored), (node) => {
    const key = savedKeyOf(node);
    if (key !== null && isPlainObject(node.fields)) saved.set(key, node.fields);
  });
  return { ...state, root: mapEditorNodes(state.root, (node) => withSavedFields(node, saved)) };
};
