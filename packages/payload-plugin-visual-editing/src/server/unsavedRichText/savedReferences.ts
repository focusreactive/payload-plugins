import type { Payload } from "payload";

import type { PlainObject } from "../../shared/plainObject.js";
import type { EditorNode } from "../../shared/richText/editorNodes.js";

import { isPlainObject } from "../../shared/plainObject.js";
import { forEachEditorNode, mapEditorNodes, rootOf } from "../../shared/richText/editorNodes.js";
import { RELATED_VALUE_NODE_TYPES } from "../../shared/richText/nodeTypes.js";
import { documentKeyOf, relatedOf } from "../../shared/richText/references.js";

const HELD_REFERENCE_KEY = "__visualEditingHeldReference";
const COLLECTION_OF_PAYLOAD_PREFIX = "payload-";

export type IsPrivateCollection = (slug: unknown) => boolean;

export const isPrivateCollectionOf =
  (payload: Payload): IsPrivateCollection =>
  (slug) =>
    typeof slug !== "string" ||
    slug.startsWith(COLLECTION_OF_PAYLOAD_PREFIX) ||
    Boolean(payload.collections[slug]?.config.auth);

const referenceKeysOf = (value: unknown): Set<string> => {
  const keys = new Set<string>();
  forEachEditorNode(rootOf(value), (node) => {
    const related = relatedOf(node);
    const key = related && documentKeyOf(related);
    if (key !== null) keys.add(key);
  });
  return keys;
};

const withReference = (node: EditorNode, value: unknown): EditorNode => {
  if (RELATED_VALUE_NODE_TYPES.has(node.type)) return { ...node, value };
  const fields = node.fields as PlainObject;
  return { ...node, fields: { ...fields, doc: { ...(fields.doc as PlainObject), value } } };
};

const mapNodesOf = (value: unknown, map: (node: EditorNode) => EditorNode): unknown => {
  const root = rootOf(value);
  return root && isPlainObject(value) ? { ...value, root: mapEditorNodes(root, map) } : value;
};

export const withOnlyReferencesOf = (
  value: unknown,
  saved: unknown,
  isPrivateCollection: IsPrivateCollection
): unknown => {
  const savedKeys = referenceKeysOf(saved);
  return mapNodesOf(value, (node) => {
    const related = relatedOf(node);
    if (!related || related.value === null || related.value === undefined) return node;
    const key = documentKeyOf(related);
    const isResolved =
      key !== null && savedKeys.has(key) && !isPrivateCollection(related.relationTo);
    if (isResolved) return node;
    return { ...withReference(node, null), [HELD_REFERENCE_KEY]: related.value };
  });
};

export const withHeldReferences = (value: unknown): unknown =>
  mapNodesOf(value, (node) => {
    if (!Object.hasOwn(node, HELD_REFERENCE_KEY)) return node;
    const { [HELD_REFERENCE_KEY]: held, ...rest } = node;
    return withReference(rest, held);
  });
