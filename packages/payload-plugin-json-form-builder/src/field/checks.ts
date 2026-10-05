import { CONTAINER_TYPES, HOLDER_TYPES, isKnown, isTyped, numberOf, TYPES } from "./typedJson.js";
import type { ArrayNode, Container, Leaf, NodeType, TypedNode, TypedRoot } from "./typedJson.js";

// `named` only turns on past a row of one unnamed field, which is a plain value, not a field.
const each = (
  root: TypedRoot,
  visit: (node: TypedNode, where: string, named: boolean) => false | void
) => {
  const go = (node: TypedNode, path: string[], named: boolean) => {
    // A nameless node contributes nothing to the path rather than an empty step in it.
    if (visit(node, path.filter(Boolean).join(" → "), named) === false) return;
    const rows = (node as ArrayNode).rows;
    // A field with no name is pointed at by its position, or two of them would read the same.
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
  // A section carries its own name now, so it is judged like every other named node.
  root.forEach((node, at) => go(node, [node.name ?? `#${at + 1}`], true));
};

const LEAVES = TYPES.filter((type) => !HOLDER_TYPES.includes(type));

// What is wrong with this one node, in the words that go under it. `problems()` is the same thing
// read over the whole tree, so the line under a field and the message the save is refused with can
// never say different things. A hidden node is skipped: it is not on the site, so an empty one is
// no mistake.
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

// The same faults with the path kept apart, for a breadcrumb rather than a sentence.
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

// Not `!value`: a number field holding 0 is filled in.
const empty = (node: Leaf) =>
  node.type === "checkbox"
    ? node.value !== true
    : node.value === undefined || node.value === null || node.value === "";

// Two nodes under one parent with the same name flatten into one, and the later silently wins — the
// form cannot show the loss and the site never learns of it. An object could not hold two such keys
// either: `JSON.parse` keeps the last and says nothing. So it is named here, at every level.
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

export const schemaErrors = (root: TypedRoot): string[] => {
  const found: string[] = [];
  sameNames(root, [], found);
  each(root, (node, where, named) => {
    const faults = nodeErrors(node, where, named);
    found.push(...faults);
    // What is under a broken node waits: half of it is usually the same mistake read twice, and
    // what survives the fix comes up on the next pass.
    if (faults.length) return false;
  });
  return found;
};

// Every key a node may carry; one outside this table is a typo, which otherwise does nothing at all.
// `only` is where a key may appear, `needed` where it must: a list keeps `fields` as the shape of
// the row that left, but lives without it while it has rows.
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

  // Without a kind there is nothing left to judge the node against.
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

// What the field refuses a save over: json that is not json, and whatever the editor has not filled
// in. The second half lives inside the value, so only the server can judge it — which is how every
// other field in the admin behaves too, Payload's own `required` included: the save is refused, the
// field is marked, the form stays modified, and you fix it and press Save again.
export const jsonErrors = (value: unknown, required?: boolean): string | true => {
  if (value != null && !Array.isArray(value)) return "This is not valid json.";
  if (required && !isTyped(value)) return "This field is required.";
  if (!isTyped(value)) return true;
  const found = problems(value);
  return found.length ? found.join("; ") : true;
};
