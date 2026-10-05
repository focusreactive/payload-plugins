// The stored shape, which the site never sees: docs/typed-json.md is the reference.

export type LeafType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "richText"
  | "upload"
  | "checkbox"
  | "select";
export type Condition = { field: string } & ({ equals: unknown } | { notEquals: unknown });
// `name` is the key a template reads, `label` the words a person reads, `order` the place a section
// takes — jsonb keeps no key order, so the only order there is, is the one written down.
type Base = {
  name?: string;
  label?: string;
  order?: number;
  required?: boolean;
  readOnly?: boolean;
  description?: string;
  hidden?: boolean;
  showIf?: Condition;
};
export type Leaf = Base & {
  type: LeafType;
  value?: unknown;
  options?: string[];
  min?: number;
  max?: number;
};
export type Container = Base & {
  type: "group" | "collapsible" | "tabs" | "tab";
  fields: TypedNode[];
};
export type ArrayNode = Base & {
  type: "array";
  fields?: TypedNode[];
  rows: TypedNode[][];
  minRows?: number;
  maxRows?: number;
};
export type TypedNode = Leaf | Container | ArrayNode;
export type TypedRoot = Record<string, TypedNode>;

export const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "richText",
  "upload",
  "checkbox",
  "select",
  "array",
  "group",
  "collapsible",
  "tabs",
  "tab",
] as const;
export type NodeType = (typeof TYPES)[number];
export const isKnown = (node: TypedNode) => (TYPES as readonly string[]).includes(node.type);

// The one field a row carries about itself: a row has no name to hang the switch on.
export const HIDDEN = "hidden";

// A value where nothing is a known kind is content, not a schema: `{ type: 'primary' }` is a button.
export const isTyped = (value: unknown): value is TypedRoot => {
  if (!isObject(value) || !Object.keys(value).length) return false;
  const nodes = Object.values(value);
  return (
    nodes.every((node) => isObject(node) && typeof node.type === "string") &&
    nodes.some((node) => isKnown(node as TypedNode))
  );
};

const fieldsOf = (fields: TypedNode[]) =>
  Object.fromEntries(
    fields.filter((field) => !field.hidden).map((field) => [field.name, flattenNode(field)])
  );

const flattenNode = (node: TypedNode): unknown => {
  if (node.type === "array") {
    // A row of one unnamed field is a plain value, not an object of one key.
    return (node.rows ?? [])
      .filter(
        (row) =>
          !row.some((field) => field.name === HIDDEN && "value" in field && field.value === true)
      )
      .map((row) => (row.length === 1 && !row[0].name ? flattenNode(row[0]) : fieldsOf(row)));
  }
  if ("fields" in node) return fieldsOf(node.fields);
  // An unknown kind is handed over untouched: it may be content this version cannot read.
  if (!isKnown(node)) return node;
  return node.value ?? blankValue(node.type);
};

const blankValue = (type: LeafType | string) =>
  type === "checkbox" ? false : type === "number" || type === "date" ? null : "";

export const flatten = (value: unknown) =>
  isTyped(value)
    ? Object.fromEntries(
        Object.entries(value)
          .filter(([, node]) => !node.hidden)
          .map(([key, node]) => [key, flattenNode(node)])
      )
    : value;

const blankRow = (shape: TypedNode[]): TypedNode[] =>
  shape.map((field) =>
    field.type === "array"
      ? { ...field, rows: [] }
      : "fields" in field
        ? { ...field, fields: blankRow(field.fields ?? []) }
        : { ...field, value: blankValue(field.type) }
  );

export const CONTAINER_TYPES: Container["type"][] = ["group", "collapsible", "tabs", "tab"];
// A list holds fields too — as the shape of a row rather than under a heading.
export const HOLDER_TYPES: NodeType[] = ["array", ...CONTAINER_TYPES];
// One reading of a number for the box that shows it and the check that judges it, so the two can
// never disagree about whether a value is one. A number written as text counts — the conversion to
// typed json never produced the `number` kind, so that is what old content looks like. Empty does
// not count: an unfilled field is `required`'s business, not min and max's.
export const numberOf = (value: unknown): number =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN;

export const isContainer = (node: TypedNode): node is Container =>
  CONTAINER_TYPES.includes(node.type as Container["type"]);
export const holdsFields = (node: TypedNode) => HOLDER_TYPES.includes(node.type);

// A node of the asked-for kind holding nothing yet, which is what the builder adds.
export const blankNode = (type: NodeType): TypedNode => {
  if (type === "array") return { name: "", type, rows: [], fields: [] };
  if (CONTAINER_TYPES.includes(type as Container["type"]))
    return { name: "", type, fields: [] } as Container;
  // A select with no options is a broken one, so a new one is born with something to offer.
  return {
    name: "",
    type,
    value: blankValue(type),
    ...(type === "select" ? { options: ["option"] } : {}),
  } as Leaf;
};

export const visible = (node: TypedNode, siblings: TypedNode[] | TypedRoot): boolean => {
  if (!node.showIf) return true;
  const sibling = Array.isArray(siblings)
    ? siblings.find((entry) => entry.name === node.showIf?.field)
    : siblings[node.showIf.field];
  const value = sibling && "value" in sibling ? sibling.value : undefined;
  return "equals" in node.showIf ? value === node.showIf.equals : value !== node.showIf.notEquals;
};

// Only an emptied list has no row to copy, which is the one case that keeps a `fields`.
export const rowShape = (node: ArrayNode) => blankRow(node.rows?.[0] ?? node.fields ?? []);

export const flattenSettings = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(flattenSettings);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === "settings" && isTyped(entry) ? flatten(entry) : flattenSettings(entry),
    ])
  );
};
