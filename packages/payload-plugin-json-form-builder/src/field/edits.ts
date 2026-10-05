import { holdsFields } from "./typedJson.js";
import type { ArrayNode, Container, TypedNode, TypedRoot } from "./typedJson.js";

// A node is found by the indexes walked to reach it, which is the only address a tree has.
export type Spot = { section: string; at: number[] };

// What a list holds is one shape, kept in its first row — or in `fields` while it has no rows.
export const shapeOf = (node: TypedNode): TypedNode[] =>
  node.type === "array"
    ? ((node as ArrayNode).rows?.[0] ?? (node as ArrayNode).fields ?? [])
    : ((node as Container).fields ?? []);

// Row one is the shape itself — it is where the edit came from — and the rest are re-dressed in it,
// each keeping what it had under the same names.
export const withShape = (node: TypedNode, shape: TypedNode[]): TypedNode => {
  if (node.type !== "array") return { ...node, fields: shape } as TypedNode;
  const rows = (node as ArrayNode).rows ?? [];
  if (!rows.length) return { ...node, fields: shape, rows: [] } as TypedNode;
  const { fields: _dropped, ...rest } = node as ArrayNode;
  return {
    ...rest,
    rows: rows.map((row, index) => (index ? dressed(shape, row) : shape)),
  } as TypedNode;
};

// A field the row already has keeps its value; one it does not have arrives blank. A group is walked
// into, so a field added deep inside reaches every row rather than only the one it was added to.
const dressed = (shape: TypedNode[], row: TypedNode[]): TypedNode[] =>
  shape.map((field) => {
    const had = field.name ? row.find((entry) => entry.name === field.name) : undefined;
    if (!had || had.type !== field.type) return field;
    const kids = childrenOf(field);
    if (!kids) return had;
    return field.type === "array"
      ? withShape(had, shapeOf(field))
      : ({ ...field, fields: dressed(kids, childrenOf(had) ?? []) } as TypedNode);
  });

const childrenOf = (node: TypedNode) => (holdsFields(node) ? shapeOf(node) : undefined);

export const nodeAt = (root: TypedRoot, spot: Spot): TypedNode | undefined =>
  spot.at.reduce<TypedNode | undefined>(
    (node, index) => (node ? childrenOf(node)?.[index] : undefined),
    root[spot.section]
  );

// One rewrite for every change: the node at the spot is handed to `edit`, and `undefined` drops it.
const rewrite = (
  fields: TypedNode[],
  at: number[],
  edit: (node: TypedNode) => TypedNode | undefined
): TypedNode[] => {
  const [index, ...rest] = at;
  const node = fields[index];
  if (!node) return fields;
  const next = rest.length ? withShape(node, rewrite(shapeOf(node), rest, edit)) : edit(node);
  return next ? fields.toSpliced(index, 1, next) : fields.toSpliced(index, 1);
};

export const editAt = (
  root: TypedRoot,
  spot: Spot,
  edit: (node: TypedNode) => TypedNode | undefined
): TypedRoot => {
  const section = root[spot.section];
  if (!section) return root;
  if (!spot.at.length) {
    const next = edit(section);
    if (next) return { ...root, [spot.section]: next };
    const { [spot.section]: _gone, ...rest } = root;
    return rest;
  }
  return { ...root, [spot.section]: withShape(section, rewrite(shapeOf(section), spot.at, edit)) };
};

// A key is what a template writes after a dot, so it is letters and digits and nothing else.
export const keyFault = (key: string, taken: string[]): string => {
  if (!key) return "A key is needed.";
  if (key.length < 3) return "A key is three characters or more.";
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key))
    return "A key is letters and digits, starting with a letter — no dashes, spaces or symbols.";
  return taken.includes(key) ? "Something beside this one already has that key." : "";
};

// A name nobody beside it has. Anything added is named at once: an unnamed node is a broken one, and
// the builder would hand the form a shape it refuses to draw.
const freeName = (taken: TypedNode[], stem = "field") => {
  const names = new Set(taken.map((field) => field.name));
  let name = stem;
  for (let n = 2; names.has(name); n++) name = `${stem}${n}`;
  return name;
};

// Added at the end of whatever holds the spot, which is the section itself when the spot is empty.
export const addAt = (root: TypedRoot, spot: Spot, node: TypedNode): TypedRoot =>
  editAt(root, spot, (parent) => {
    const shape = shapeOf(parent);
    return withShape(parent, [
      ...shape,
      { ...node, name: node.name || freeName(shape, node.type === "tab" ? "tab" : "field") },
    ]);
  });

// A section is named by its key, so it carries no `name` of its own.
export const addSection = (root: TypedRoot, key: string, node: TypedNode): TypedRoot => {
  const { name: _unnamed, ...rest } = node;
  return { ...root, [key]: { ...rest, order: Object.keys(root).length } as TypedNode };
};

export const renameSection = (root: TypedRoot, from: string, to: string): TypedRoot =>
  Object.fromEntries(Object.entries(root).map(([key, node]) => [key === from ? to : key, node]));
