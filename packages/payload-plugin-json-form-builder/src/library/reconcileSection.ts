import { dressed, shapeOf } from "../field/edits.js";
import { isTyped } from "../field/typedJson.js";
import type { ArrayNode, Container, TypedNode, TypedRoot } from "../field/typedJson.js";

const sourceOf = (node: TypedNode) => node.source ?? "";

const reshape = (own: TypedNode, source: TypedNode): TypedNode => {
  const head = { ...source, name: own.name, hidden: own.hidden, source: own.source };

  if (source.type === "array") {
    const { fields: _shape, ...rest } = head as ArrayNode;
    return {
      ...rest,
      rows: ((own as ArrayNode).rows ?? []).map((row) => dressed(shapeOf(source), row)),
    } as TypedNode;
  }

  if ("fields" in source) {
    return {
      ...head,
      fields: dressed(shapeOf(source), (own as Container).fields ?? []),
    } as TypedNode;
  }

  return { ...head, value: (own as { value?: unknown }).value } as TypedNode;
};

export const reconcile = (value: unknown, library: unknown): unknown => {
  if (!isTyped(value)) return value;
  const shared = isTyped(library) ? (library as TypedRoot) : [];

  return (value as TypedRoot).map((node) => {
    const key = sourceOf(node);
    if (!key) return node;
    const source = shared.find((entry) => entry.name === key);
    if (source) return reshape(node, source);
    const { source: _gone, ...own } = node;
    return own as TypedNode;
  });
};

export const followed = (node: TypedNode): boolean => sourceOf(node) !== "";

export const following = (node: TypedNode, name: string): TypedNode => ({ ...node, source: name });

export const follows = (value: unknown): boolean =>
  isTyped(value) && (value as TypedRoot).some((node) => sourceOf(node) !== "");
