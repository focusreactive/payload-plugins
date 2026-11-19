import type { VeEditorState } from "../protocol.js";
import type { PlainObject } from "../plainObject.js";
import type { EditorNode } from "./editorNodes.js";

import { isPlainObject } from "../plainObject.js";
import { idOf } from "../veDocument.js";
import { childrenOf, forEachEditorNode, mapEditorNodes, rootOf } from "./editorNodes.js";
import { BLOCK_NODE_TYPES, LINK_NODE_TYPES, RELATED_VALUE_NODE_TYPES } from "./nodeTypes.js";
import { TARGET_FIELDS_OF_A_LINK } from "./savedNodeFields.js";

const INTERNAL_LINK_TYPE = "internal";

type Related = PlainObject & { relationTo?: unknown; value?: unknown };

export interface References {
  populate(state: VeEditorState): VeEditorState;
  withoutUnresolved(state: VeEditorState): VeEditorState;
}

const isLinkWithReferences = ({ fields }: EditorNode): boolean =>
  isPlainObject(fields) &&
  (fields.linkType === INTERNAL_LINK_TYPE ||
    Object.keys(fields).some((name) => !TARGET_FIELDS_OF_A_LINK.includes(name)));

const refersOutside = (node: EditorNode): boolean =>
  BLOCK_NODE_TYPES.has(node.type) ||
  RELATED_VALUE_NODE_TYPES.has(node.type) ||
  (LINK_NODE_TYPES.has(node.type) && isLinkWithReferences(node));

export const hasReferences = (value: unknown): boolean => {
  let refers = false;
  forEachEditorNode(rootOf(value), (node) => {
    refers ||= refersOutside(node);
  });
  return refers;
};

const linkedDocumentOf = ({ fields }: EditorNode): PlainObject | null =>
  isPlainObject(fields) && isPlainObject(fields.doc) ? fields.doc : null;

export const relatedOf = (node: EditorNode): Related | null => {
  if (RELATED_VALUE_NODE_TYPES.has(node.type)) return node;
  return LINK_NODE_TYPES.has(node.type) ? linkedDocumentOf(node) : null;
};

const idOfRelated = (value: unknown): string | number | null =>
  isPlainObject(value) ? idOf(value.id) : idOf(value);

export const documentKeyOf = ({ relationTo, value }: Related): string | null => {
  const id = idOfRelated(value);
  return typeof relationTo === "string" && id !== null
    ? JSON.stringify([relationTo, String(id)])
    : null;
};

const documentsIn = (base: unknown): Map<string, unknown> => {
  const documents = new Map<string, unknown>();
  forEachEditorNode(rootOf(base), (node) => {
    const related = relatedOf(node);
    const key = related && documentKeyOf(related);
    if (related && key !== null) documents.set(key, related.value);
  });
  return documents;
};

const withoutNodes = (node: EditorNode, isDropped: (node: EditorNode) => boolean): EditorNode =>
  Array.isArray(node.children)
    ? {
        ...node,
        children: childrenOf(node)
          .filter((child) => !isDropped(child))
          .map((child) => withoutNodes(child, isDropped)),
      }
    : node;

export const referencesIn = (base: unknown): References => {
  const documents = documentsIn(base);
  const documentOf = (related: Related) => {
    const key = documentKeyOf(related);
    return key !== null && documents.has(key) ? { value: documents.get(key) } : null;
  };

  const populate = (node: EditorNode): EditorNode => {
    const related = relatedOf(node);
    const document = related && documentOf(related);
    if (!related || !document) return node;
    if (RELATED_VALUE_NODE_TYPES.has(node.type)) return { ...node, value: document.value };
    return {
      ...node,
      fields: { ...(node.fields as PlainObject), doc: { ...related, ...document } },
    };
  };

  const isUnresolved = (node: EditorNode): boolean =>
    RELATED_VALUE_NODE_TYPES.has(node.type) && documentOf(node) === null;

  return {
    populate: (state) => ({ ...state, root: mapEditorNodes(state.root, populate) }),
    withoutUnresolved: (state) => {
      const root = rootOf(state);
      return root ? { ...state, root: withoutNodes(root, isUnresolved) } : state;
    },
  };
};
