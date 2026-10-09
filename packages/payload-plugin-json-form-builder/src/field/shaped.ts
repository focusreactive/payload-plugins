import { valued } from "./edits.js";
import { isTyped } from "./typedJson.js";
import type { ArrayNode, Container, TypedNode, TypedRoot } from "./typedJson.js";

export type Shapes = Record<string, TypedNode[]>;

const level = (nodes: TypedNode[], shapes: Shapes): TypedNode[] => {
  const out: TypedNode[] = [];

  for (let at = 0; at < nodes.length; ) {
    const shape = nodes[at].shape;
    if (!shape) {
      out.push(deep(nodes[at], shapes));
      at += 1;
      continue;
    }

    let upto = at + 1;
    while (upto < nodes.length && nodes[upto].shape === shape) upto += 1;
    const run = nodes.slice(at, upto);

    // A shape the config no longer offers takes its fields with it.
    out.push(
      ...(shapes[shape] ?? []).map((field) => ({
        ...valued(
          field,
          run.find((node) => node.name === field.name)
        ),
        shape,
      }))
    );

    at = upto;
  }

  return out;
};

const deep = (node: TypedNode, shapes: Shapes): TypedNode => {
  if (node.type === "array")
    return { ...node, rows: ((node as ArrayNode).rows ?? []).map((row) => level(row, shapes)) };
  if ("fields" in node) return { ...node, fields: level((node as Container).fields, shapes) };
  return node;
};

export const shaped = (value: unknown, shapes: Shapes): unknown =>
  isTyped(value) ? level(value as TypedRoot, shapes) : value;

export const isShaped = (value: unknown): boolean => {
  const some = (nodes: TypedNode[]): boolean =>
    nodes.some(
      (node) =>
        Boolean(node.shape) ||
        (node.type === "array"
          ? ((node as ArrayNode).rows ?? []).some(some)
          : "fields" in node
            ? some((node as Container).fields)
            : false)
    );
  return isTyped(value) && some(value as TypedRoot);
};
