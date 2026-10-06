import { dressed, shapeOf } from "../field/edits.js";
import { isTyped } from "../field/typedJson.js";
import type { ArrayNode, Container, TypedNode, TypedRoot } from "../field/typedJson.js";

export const SOURCE = "source";

const sourceOf = (node: TypedNode) => {
  const named = (node as Record<string, unknown>)[SOURCE];
  return typeof named === "string" ? named : "";
};

const reshape = (own: TypedNode, source: TypedNode): TypedNode => {
  const head = { ...source, name: own.name, hidden: own.hidden, [SOURCE]: sourceOf(own) };

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
    return source ? reshape(node, source) : node;
  });
};

export const follows = (value: unknown): boolean =>
  isTyped(value) && (value as TypedRoot).some((node) => sourceOf(node) !== "");
