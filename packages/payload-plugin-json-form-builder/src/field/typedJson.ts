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
type Base = {
  name?: string;
  source?: string;
  label?: string;
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
  time?: boolean;
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
export type TypedRoot = TypedNode[];

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

export const HIDDEN = "hidden";

// A value where nothing is a known kind is content, not a schema: `{ type: 'primary' }` is a button.
export const isTyped = (value: unknown): value is TypedRoot =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((node) => isObject(node) && typeof node.type === "string") &&
  value.some((node) => isKnown(node as TypedNode));

export type ResolveUpload = (url: string) => unknown;

const fieldsOf = (fields: TypedNode[], resolve?: ResolveUpload) =>
  Object.fromEntries(
    fields
      .filter((field) => !field.hidden)
      .map((field) => [field.name, flattenNode(field, resolve)])
  );

const flattenNode = (node: TypedNode, resolve?: ResolveUpload): unknown => {
  if (node.type === "array") {
    return (node.rows ?? [])
      .filter(
        (row) =>
          !row.some((field) => field.name === HIDDEN && "value" in field && field.value === true)
      )
      .map((row) =>
        row.length === 1 && !row[0].name ? flattenNode(row[0], resolve) : fieldsOf(row, resolve)
      );
  }
  if ("fields" in node) return fieldsOf(node.fields, resolve);
  if (!isKnown(node)) return node;
  const value = node.value ?? blankValue(node.type);
  if (node.type === "upload" && resolve && typeof value === "string" && value)
    return resolve(value);
  return value;
};

export const uploadUrls = (value: unknown): string[] => {
  const found: string[] = [];
  const walk = (nodes: TypedNode[]) => {
    for (const node of nodes) {
      if (node.type === "upload" && typeof node.value === "string" && node.value)
        found.push(node.value);
      else if (node.type === "array") for (const row of node.rows ?? []) walk(row);
      else if ("fields" in node) walk(node.fields);
    }
  };
  if (isTyped(value)) walk(value as TypedNode[]);
  return found;
};

const blankValue = (type: LeafType | string) =>
  type === "checkbox" ? false : type === "number" || type === "date" ? null : "";

export const flatten = (value: unknown, resolve?: ResolveUpload) =>
  isTyped(value) ? fieldsOf(value, resolve) : value;

const blankRow = (shape: TypedNode[]): TypedNode[] =>
  shape.map((field) =>
    field.type === "array"
      ? { ...field, rows: [] }
      : "fields" in field
        ? { ...field, fields: blankRow(field.fields ?? []) }
        : { ...field, value: blankValue(field.type) }
  );

export const CONTAINER_TYPES: Container["type"][] = ["group", "collapsible", "tabs", "tab"];
export const HOLDER_TYPES: NodeType[] = ["array", ...CONTAINER_TYPES];
export const numberOf = (value: unknown): number =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN;

export const isContainer = (node: TypedNode): node is Container =>
  CONTAINER_TYPES.includes(node.type as Container["type"]);
export const holdsFields = (node: TypedNode) => HOLDER_TYPES.includes(node.type);

export const blankNode = (type: NodeType): TypedNode => {
  if (type === "array") return { name: "", type, rows: [], fields: [] };
  if (CONTAINER_TYPES.includes(type as Container["type"]))
    return { name: "", type, fields: [] } as Container;
  return {
    name: "",
    type,
    value: blankValue(type),
    ...(type === "select" ? { options: ["option"] } : {}),
  } as Leaf;
};

export const visible = (node: TypedNode, siblings: TypedNode[]): boolean => {
  if (!node.showIf) return true;
  const sibling = siblings.find((entry) => entry.name === node.showIf?.field);
  const value = sibling && "value" in sibling ? sibling.value : undefined;
  return "equals" in node.showIf ? value === node.showIf.equals : value !== node.showIf.notEquals;
};

export const rowShape = (node: ArrayNode) => blankRow(node.rows?.[0] ?? node.fields ?? []);
