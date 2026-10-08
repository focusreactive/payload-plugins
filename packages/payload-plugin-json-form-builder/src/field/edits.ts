import { HIDDEN, holdsFields } from "./typedJson.js";
import type { ArrayNode, Container, Leaf, TypedNode, TypedRoot } from "./typedJson.js";

export type Spot = { section: string; at: number[] };

export const shapeOf = (node: TypedNode): TypedNode[] =>
  node.type === "array"
    ? ((node as ArrayNode).rows?.[0] ?? (node as ArrayNode).fields ?? [])
    : ((node as Container).fields ?? []);

// A hidden row is marked by a field the schema does not have, so it belongs to the row rather than
// to the shape: taken from the row being dressed, never from the one the shape was read off.
export const dressed = (shape: TypedNode[], row: TypedNode[]): TypedNode[] => {
  const worn = shape
    .filter((field) => field.name !== HIDDEN)
    .map((field) =>
      valued(field, field.name ? row.find((entry) => entry.name === field.name) : undefined)
    );
  const mark = row.find((field) => field.name === HIDDEN);
  return mark ? [...worn, mark] : worn;
};

// A shape worn by values that are someone else's: the shape says which fields there are and how
// they are drawn, the value says what they hold, and every row keeps what it holds. `withShape` is
// the other half of the pair — there row one *is* the shape, because it is the edit it came from.
export const valued = (shape: TypedNode, own: TypedNode | undefined): TypedNode => {
  if (!own) return shape;
  const head = { ...shape, hidden: own.hidden };

  // A list carries rows, a container carries fields and a leaf carries a value, so a kind that
  // turned into another kind has nothing to hand over — except between the containers, which hold
  // the same thing and are told apart only by how the admin draws them.
  if (shape.type === "array") {
    if (own.type !== "array") return shape;
    const { fields: _shape, ...rest } = head as ArrayNode;
    return {
      ...rest,
      rows: ((own as ArrayNode).rows ?? []).map((row) => dressed(shapeOf(shape), row)),
    } as TypedNode;
  }

  if (holdsFields(shape)) {
    if (!holdsFields(own)) return shape;
    return {
      ...head,
      fields: dressed(shapeOf(shape), (own as Container).fields ?? []),
    } as TypedNode;
  }

  if (own.type !== shape.type) return shape;
  return { ...head, value: (own as Leaf).value } as TypedNode;
};

// Row one is the shape itself — it is where the edit came from — and the rest are re-dressed in it.
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

const childrenOf = (node: TypedNode) => (holdsFields(node) ? shapeOf(node) : undefined);

const seatOf = (root: TypedRoot, name: string) => root.findIndex((node) => node.name === name);

export const nodeAt = (root: TypedRoot, spot: Spot): TypedNode | undefined =>
  spot.at.reduce<TypedNode | undefined>(
    (node, index) => (node ? childrenOf(node)?.[index] : undefined),
    root[seatOf(root, spot.section)]
  );

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
  const seat = seatOf(root, spot.section);
  const section = root[seat];
  if (!section) return root;
  if (!spot.at.length) {
    const next = edit(section);
    return next ? root.toSpliced(seat, 1, next) : root.toSpliced(seat, 1);
  }
  return root.toSpliced(seat, 1, withShape(section, rewrite(shapeOf(section), spot.at, edit)));
};

export const keyFault = (key: string, taken: string[]): string => {
  if (!key) return "A key is needed.";
  if (key.length < 3) return "A key is three characters or more.";
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key))
    return "A key is letters and digits, starting with a letter — no dashes, spaces or symbols.";
  return taken.includes(key) ? "Something beside this one already has that key." : "";
};

const freeName = (taken: TypedNode[], stem = "field") => {
  const names = new Set(taken.map((field) => field.name));
  let name = stem;
  for (let n = 2; names.has(name); n++) name = `${stem}${n}`;
  return name;
};

export const addAt = (root: TypedRoot, spot: Spot, node: TypedNode): TypedRoot =>
  editAt(root, spot, (parent) => {
    const shape = shapeOf(parent);
    return withShape(parent, [
      ...shape,
      { ...node, name: node.name || freeName(shape, node.type === "tab" ? "tab" : "field") },
    ]);
  });

export const addManyAt = (root: TypedRoot, spot: Spot, nodes: TypedNode[]): TypedRoot =>
  editAt(root, spot, (parent) => withShape(parent, [...shapeOf(parent), ...nodes]));

export const addSection = (root: TypedRoot, key: string, node: TypedNode): TypedRoot => [
  ...root,
  { ...node, name: key } as TypedNode,
];

export const renameSection = (root: TypedRoot, from: string, to: string): TypedRoot =>
  root.map((node) => (node.name === from ? { ...node, name: to } : node));
