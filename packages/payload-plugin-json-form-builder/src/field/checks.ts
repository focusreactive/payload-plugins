import { CONTAINER_TYPES, HOLDER_TYPES, isKnown, isTyped, numberOf, TYPES } from "./typedJson.js";
import type { ArrayNode, Container, Leaf, NodeType, TypedNode, TypedRoot } from "./typedJson.js";

const each = (
  root: TypedRoot,
  visit: (node: TypedNode, where: string, named: boolean) => false | void
) => {
  const go = (node: TypedNode, path: string[], named: boolean) => {
    if (visit(node, path.filter(Boolean).join(" → "), named) === false) return;
    const rows = (node as ArrayNode).rows;
    if (Array.isArray(rows)) {
      return rows.forEach((row, index) =>
        row.forEach((field, at) =>
          go(
            field,
            [...path, `${index + 1}`, field.name ?? (row.length > 1 ? `#${at + 1}` : "")],
            row.length > 1
          )
        )
      );
    }
    const fields = (node as Container).fields;
    if (Array.isArray(fields))
      fields.forEach((field, at) => go(field, [...path, field.name ?? `#${at + 1}`], true));
  };
  root.forEach((node, at) => go(node, [node.name ?? `#${at + 1}`], true));
};

const LEAVES = TYPES.filter((type) => !HOLDER_TYPES.includes(type));

export const nodeFault = (node: TypedNode): string => {
  if (node.hidden) return "";
  if (node.type === "array") {
    const rows = node.rows ?? [];
    if (node.required && !rows.length) return "At least one row is needed.";
    if (node.minRows && rows.length < node.minRows)
      return `At least ${node.minRows} rows are needed.`;
    if (node.maxRows && rows.length > node.maxRows)
      return `At most ${node.maxRows} rows are allowed.`;
    return "";
  }
  if ("fields" in node) return "";
  if (node.required && empty(node)) return "This field is required.";
  if (node.type === "number") {
    const held = numberOf(node.value);
    if (Number.isFinite(held)) {
      if (node.min !== undefined && held < node.min) return `This is less than ${node.min}.`;
      if (node.max !== undefined && held > node.max) return `This is more than ${node.max}.`;
    }
  }
  return "";
};

export type Fault = { message: string; path: string[] };

export const faults = (root: TypedRoot): Fault[] => {
  const found: Fault[] = [];
  each(root, (node, where) => {
    if (node.hidden) return false;
    const message = nodeFault(node);
    if (message) found.push({ message, path: where.split(" → ") });
  });
  return found;
};

export const problems = (root: TypedRoot): string[] =>
  faults(root).map((fault) => `${fault.path.join(" → ")}: ${fault.message}`);

const empty = (node: Leaf) =>
  node.type === "checkbox"
    ? node.value !== true
    : node.value === undefined || node.value === null || node.value === "";

const sameNames = (fields: TypedNode[], path: string[], found: string[]) => {
  const seen = new Set<string>();
  for (const field of fields) {
    const here = [...path, field.name ?? ""].filter(Boolean);
    if (field.name) {
      if (seen.has(field.name)) found.push(`${here.join(" → ")}: a second node has this name`);
      seen.add(field.name);
    }
    const rows = (field as ArrayNode).rows;
    if (Array.isArray(rows)) {
      rows.forEach((row, at) => sameNames(row, [...here, `${at + 1}`], found));
    }
    const kids = (field as Container).fields;
    if (Array.isArray(kids)) sameNames(kids, here, found);
  }
};

// Two nodes under one parent with the same name flatten into one and the later silently wins, so
// duplicates are named at every level.
export const schemaErrors = (root: TypedRoot): string[] => {
  const found: string[] = [];
  sameNames(root, [], found);
  each(root, (node, where, named) => {
    const faults = nodeErrors(node, where, named);
    found.push(...faults);
    if (faults.length) return false;
  });
  return found;
};

type Rule = {
  kind: "any" | "array" | "boolean" | "number" | "object" | "string";
  needed?: readonly NodeType[];
  only?: readonly NodeType[];
  reads?: string;
};
const KEYS: Record<string, Rule> = {
  description: { kind: "string" },
  fields: { kind: "array", needed: CONTAINER_TYPES, only: HOLDER_TYPES },
  hidden: { kind: "boolean" },
  label: { kind: "string" },
  max: { kind: "number", only: ["number"] },
  maxRows: { kind: "number", only: ["array"] },
  min: { kind: "number", only: ["number"] },
  minRows: { kind: "number", only: ["array"] },
  name: { kind: "string" },
  options: { kind: "array", needed: ["select"], only: ["select"] },
  readOnly: { kind: "boolean" },
  required: { kind: "boolean" },
  rows: { kind: "array", needed: ["array"], only: ["array"] },
  showIf: { kind: "object" },
  type: { kind: "string" },
  value: { kind: "any", needed: LEAVES, only: LEAVES, reads: "a field, not a group or a list" },
};

const kindOf = (value: unknown) =>
  Array.isArray(value) ? "array" : value === null ? "object" : typeof value;
const wording = (rule: Rule) =>
  rule.kind === "array" ? "a list" : rule.kind === "object" ? "an object" : `a ${rule.kind}`;
const belongsTo = (rule: Rule) => rule.reads ?? rule.only?.join(", ");

const nodeErrors = (node: TypedNode, where: string, named: boolean): string[] => {
  const here: string[] = [];
  const say = (what: string) => here.push(what);

  for (const key of Object.keys(node)) if (!KEYS[key]) say(`${where}: unknown key “${key}”`);
  if (named && !node.name) say(`${where}: no name`);

  if (!("type" in node)) {
    say(`${where}: no “type”`);
    return here;
  }
  if (!isKnown(node)) {
    say(`${where}: unknown type “${node.type}”`);
    return here;
  }

  for (const [key, rule] of Object.entries(KEYS)) {
    const belongs = !rule.only || rule.only.includes(node.type);
    const entry = (node as Record<string, unknown>)[key];
    if (!(key in node)) {
      if (rule.needed?.includes(node.type)) say(`${where}: no “${key}”`);
    } else if (!belongs) say(`${where}: “${key}” is only for ${belongsTo(rule)}`);
    else if (rule.kind !== "any" && kindOf(entry) !== rule.kind)
      say(`${where}: “${key}” must be ${wording(rule)}`);
  }

  const fields = (node as Container).fields;
  const options = (node as Leaf).options;
  if (node.type === "select" && Array.isArray(options) && !options.length)
    say(`${where}: “options” is empty`);
  if (node.type === "tabs" && Array.isArray(fields) && fields.some((field) => field.type !== "tab"))
    say(`${where}: “fields” may hold tabs only`);
  const condition = node.showIf as Record<string, unknown> | undefined;
  if (
    condition &&
    (typeof condition.field !== "string" || !("equals" in condition || "notEquals" in condition))
  )
    say(`${where}: “showIf” needs a field and an equals or notEquals`);

  return here;
};

export const jsonErrors = (value: unknown, required?: boolean): string | true => {
  if (value != null && typeof value !== "object") return "This is not valid json.";
  if (required && !isTyped(value)) return "This field is required.";
  if (!isTyped(value)) return true;
  const found = problems(value);
  return found.length ? found.join("; ") : true;
};
