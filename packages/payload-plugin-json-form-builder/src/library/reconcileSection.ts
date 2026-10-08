import { valued } from "../field/edits.js";
import { isTyped } from "../field/typedJson.js";
import type { TypedNode, TypedRoot } from "../field/typedJson.js";

const sourceOf = (node: TypedNode) => node.source ?? "";

// The library owns the shape and the edition owns what is written into it — which is `valued`, the
// same pairing every row of every list below here goes through. Only the three that say *which*
// section this is are the edition's: what it is called, whether it runs, and what it follows.
const reshape = (own: TypedNode, source: TypedNode): TypedNode =>
  ({ ...valued(source, own), name: own.name, hidden: own.hidden, source: own.source }) as TypedNode;

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
