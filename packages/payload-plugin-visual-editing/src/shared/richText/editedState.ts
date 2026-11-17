import type { PlainObject } from "../plainObject.js";
import type { VeEditorState } from "../protocol.js";
import type { FixedNode } from "./editableNodes.js";
import type { EditorNode } from "./editorNodes.js";
import type { VeRichTextFormats } from "./formats.js";

import { isPlainObject } from "../plainObject.js";
import { isSameValue } from "../sameValue.js";
import { withoutBlockFields } from "./blockNodes.js";
import {
  AUTO_LINK_NODE_TYPE,
  fixedNodesOf,
  forEachEditableNode,
  mapEditableNodes,
  HEADING_NODE_TYPE,
  isEditableNode,
  LINE_BREAK_NODE_TYPE,
  LINK_NODE_TYPE,
  LIST_ITEM_NODE_TYPE,
  LIST_NODE_TYPE,
  PARAGRAPH_NODE_TYPE,
  QUOTE_NODE_TYPE,
  ROOT_NODE_TYPE,
  TAB_NODE_TYPE,
  TEXT_NODE_TYPE,
  withFixedNodes,
} from "./editableNodes.js";
import { rootOf } from "./editorNodes.js";
import {
  BULLET_LIST,
  CHECK_LIST,
  EVERY_TEXT_FORMAT,
  formatsIn,
  NUMBERED_LIST,
  withFormats,
} from "./formats.js";
import { isAllowedLinkUrl } from "./linkUrls.js";
import { BLOCK_NODE_TYPES } from "./nodeTypes.js";
import { TARGET_FIELDS_OF_A_LINK } from "./savedNodeFields.js";

export type EditedStateSources = {
  shown: unknown;
  stored: unknown;
  formats: VeRichTextFormats;
};

type Known = {
  formats: VeRichTextFormats;
  styles: ReadonlySet<string>;
  nodeStates: readonly unknown[];
  linkUrls: Map<string, string>;
};

type Check = (value: unknown, known: Known, node: EditorNode) => boolean;

type NodeRule = {
  keys: Readonly<Record<string, Check>>;
  optional: readonly string[];
  children: readonly string[] | null;
  isAllowed: (node: EditorNode, known: Known) => boolean;
};

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);
const NODE_STATE_KEY = "$";
const STATE_KEYS: ReadonlySet<string> = new Set(["root"]);
const DIRECTIONS: ReadonlySet<unknown> = new Set([null, "ltr", "rtl"]);
const ELEMENT_FORMATS: ReadonlySet<unknown> = new Set([
  "",
  "left",
  "start",
  "center",
  "right",
  "end",
  "justify",
]);
const TEXT_MODES: ReadonlySet<unknown> = new Set(["normal", "token", "segmented"]);
const EVERY_TEXT_DETAIL = 3;
const MAX_INDENT = 100;
const MAX_VERSION = 1000;
const CUSTOM_LINK = "custom";
const INTERNAL_LINK = "internal";
const LINK_TYPES: ReadonlySet<unknown> = new Set([CUSTOM_LINK, INTERNAL_LINK]);
const BULLET_TAG = "ul";
const NUMBERED_TAG = "ol";
const TAG_OF_LIST: Readonly<Record<string, string>> = {
  [BULLET_LIST]: BULLET_TAG,
  [CHECK_LIST]: BULLET_TAG,
  [NUMBERED_LIST]: NUMBERED_TAG,
};
const INLINE_TYPES: readonly string[] = [
  TEXT_NODE_TYPE,
  TAB_NODE_TYPE,
  LINE_BREAK_NODE_TYPE,
  LINK_NODE_TYPE,
  AUTO_LINK_NODE_TYPE,
];
const TYPES_INSIDE_A_LINK: readonly string[] = [
  TEXT_NODE_TYPE,
  TAB_NODE_TYPE,
  LINE_BREAK_NODE_TYPE,
];
const BLOCK_TYPES: readonly string[] = [
  PARAGRAPH_NODE_TYPE,
  HEADING_NODE_TYPE,
  QUOTE_NODE_TYPE,
  LIST_NODE_TYPE,
];

const isIntegerWithin = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

const isString: Check = (value) => typeof value === "string";
const isList: Check = (value) => Array.isArray(value);
const isVersion: Check = (value) => isIntegerWithin(value, 1, MAX_VERSION);
const isDirection: Check = (value) => DIRECTIONS.has(value);
const isElementFormat: Check = (value) => ELEMENT_FORMATS.has(value);
const isIndent: Check = (value) => isIntegerWithin(value, 0, MAX_INDENT);
const isTextDetail: Check = (value) => isIntegerWithin(value, 0, EVERY_TEXT_DETAIL);
const isTextMode: Check = (value) => TEXT_MODES.has(value);
const isCount: Check = (value) => isIntegerWithin(value, 0, Number.MAX_SAFE_INTEGER);
const isFlag: Check = (value) => typeof value === "boolean";

const isAllowedTextFormat: Check = (value, { formats }) =>
  isIntegerWithin(value, 0, EVERY_TEXT_FORMAT) && ((value as number) & ~formats.textFormats) === 0;

const isKnownStyle: Check = (value, { styles }) =>
  value === "" || (typeof value === "string" && styles.has(value));

const isKnownNodeState: Check = (value, { nodeStates }) =>
  nodeStates.some((known) => isSameValue(known, value));

const isAllowedHeadingTag: Check = (value, { formats }) =>
  typeof value === "string" && formats.headings.includes(value);

const isAllowedListType: Check = (value, { formats }) =>
  typeof value === "string" && formats.lists.includes(value);

const isTagOfItsList: Check = (value, _known, { listType }) =>
  typeof listType === "string" && TAG_OF_LIST[listType] === value;

const isLinkedDocument = (doc: unknown): boolean => {
  if (doc === undefined || doc === null) return true;
  if (!isPlainObject(doc) || Object.keys(doc).length !== 2) return false;
  const { relationTo, value } = doc;
  return typeof relationTo === "string" && (typeof value === "string" || typeof value === "number");
};

const takeStoredAddress = (linkUrls: Map<string, string>, id: unknown, url: string): boolean => {
  if (typeof id !== "string" || linkUrls.get(id) !== url) return false;
  linkUrls.delete(id);
  return true;
};

const isAddressOfLink = (fields: PlainObject, { linkUrls }: Known, id: unknown): boolean => {
  const { linkType, url } = fields;
  if (url === undefined) return linkType === INTERNAL_LINK;
  if (typeof url !== "string") return false;
  if (url === "" && linkType === CUSTOM_LINK) return false;
  return url === "" || isAllowedLinkUrl(url) || takeStoredAddress(linkUrls, id, url);
};

const areLinkFields: Check = (fields, known, { id }) => {
  if (!isPlainObject(fields)) return false;
  const { doc, linkType, newTab } = fields;
  if (!LINK_TYPES.has(linkType)) return false;
  if (newTab !== undefined && typeof newTab !== "boolean") return false;
  return isLinkedDocument(doc) && isAddressOfLink(fields, known, id);
};

const NODE_KEYS: Readonly<Record<string, Check>> = {
  [NODE_STATE_KEY]: isKnownNodeState,
  type: isString,
  version: isVersion,
};

const ELEMENT_KEYS: Readonly<Record<string, Check>> = {
  ...NODE_KEYS,
  children: isList,
  direction: isDirection,
  format: isElementFormat,
  indent: isIndent,
};

const BLOCK_KEYS: Readonly<Record<string, Check>> = {
  ...ELEMENT_KEYS,
  textFormat: isAllowedTextFormat,
  textStyle: isKnownStyle,
};

const TEXT_KEYS: Readonly<Record<string, Check>> = {
  ...NODE_KEYS,
  detail: isTextDetail,
  format: isAllowedTextFormat,
  mode: isTextMode,
  style: isKnownStyle,
  text: isString,
};

const TEXT_FORMAT_KEYS: readonly string[] = [NODE_STATE_KEY, "textFormat", "textStyle"];

const always = (): boolean => true;

const TEXT_RULE: NodeRule = {
  children: null,
  isAllowed: always,
  keys: TEXT_KEYS,
  optional: [NODE_STATE_KEY],
};

const LINK_RULE: NodeRule = {
  children: TYPES_INSIDE_A_LINK,
  isAllowed: (_node, { formats }) => formats.hasLinks,
  keys: { ...BLOCK_KEYS, fields: areLinkFields, id: isString },
  optional: [...TEXT_FORMAT_KEYS, "id"],
};

const RULES: Readonly<Record<string, NodeRule>> = {
  [AUTO_LINK_NODE_TYPE]: LINK_RULE,
  [HEADING_NODE_TYPE]: {
    children: INLINE_TYPES,
    isAllowed: always,
    keys: { ...BLOCK_KEYS, tag: isAllowedHeadingTag },
    optional: TEXT_FORMAT_KEYS,
  },
  [LINE_BREAK_NODE_TYPE]: {
    children: null,
    isAllowed: always,
    keys: NODE_KEYS,
    optional: [NODE_STATE_KEY],
  },
  [LINK_NODE_TYPE]: LINK_RULE,
  [LIST_ITEM_NODE_TYPE]: {
    children: [...INLINE_TYPES, LIST_NODE_TYPE],
    isAllowed: always,
    keys: { ...BLOCK_KEYS, checked: isFlag, value: isCount },
    optional: [...TEXT_FORMAT_KEYS, "checked"],
  },
  [LIST_NODE_TYPE]: {
    children: [LIST_ITEM_NODE_TYPE],
    isAllowed: always,
    keys: { ...BLOCK_KEYS, listType: isAllowedListType, start: isCount, tag: isTagOfItsList },
    optional: TEXT_FORMAT_KEYS,
  },
  [PARAGRAPH_NODE_TYPE]: {
    children: INLINE_TYPES,
    isAllowed: always,
    keys: BLOCK_KEYS,
    optional: TEXT_FORMAT_KEYS,
  },
  [QUOTE_NODE_TYPE]: {
    children: INLINE_TYPES,
    isAllowed: (_node, { formats }) => formats.hasQuotes,
    keys: BLOCK_KEYS,
    optional: TEXT_FORMAT_KEYS,
  },
  [ROOT_NODE_TYPE]: {
    children: BLOCK_TYPES,
    isAllowed: always,
    keys: ELEMENT_KEYS,
    optional: [NODE_STATE_KEY],
  },
  [TAB_NODE_TYPE]: TEXT_RULE,
  [TEXT_NODE_TYPE]: TEXT_RULE,
};

const ruleOf = ({ type }: EditorNode): NodeRule | null =>
  typeof type === "string" && Object.hasOwn(RULES, type) ? (RULES[type] ?? null) : null;

const hasItsKeys = (node: EditorNode, { keys, optional }: NodeRule, known: Known): boolean => {
  const names = Object.keys(node);
  const hasOnlyItsKeys = names.every((name) => Object.hasOwn(keys, name));
  const hasEveryKey = Object.keys(keys).every(
    (name) => optional.includes(name) || Object.hasOwn(node, name)
  );
  return (
    hasOnlyItsKeys && hasEveryKey && names.every((name) => keys[name]?.(node[name], known, node))
  );
};

function isEditableTree(node: EditorNode, known: Known): boolean {
  const rule = ruleOf(node);
  if (!rule || !rule.isAllowed(node, known) || !hasItsKeys(node, rule, known)) return false;
  const { children } = rule;
  if (children === null) return true;
  return (node.children as unknown[]).every((child) => {
    if (!isPlainObject(child)) return false;
    if (!isEditableNode(child)) return true;
    return children.includes(child.type as string) && isEditableTree(child, known);
  });
}

const hasForbiddenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isPlainObject(value)) return false;
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.has(key) || hasForbiddenKey(value[key]));
};

const knownIn = (sources: readonly unknown[], formats: VeRichTextFormats): Known => {
  const styles = new Set<string>();
  const nodeStates: unknown[] = [];
  const linkUrls = new Map<string, string>();
  const remember = (node: EditorNode) => {
    for (const style of [node.style, node.textStyle]) {
      if (typeof style === "string") styles.add(style);
    }
    if (Object.hasOwn(node, NODE_STATE_KEY)) nodeStates.push(node[NODE_STATE_KEY]);
    const url = isPlainObject(node.fields) ? node.fields.url : undefined;
    if (typeof node.id === "string" && typeof url === "string") linkUrls.set(node.id, url);
  };
  for (const source of sources) forEachEditableNode(source, remember);
  return { formats, linkUrls, nodeStates, styles };
};

const identityOf = ({ fields, id, type }: EditorNode): unknown[] => {
  const block = BLOCK_NODE_TYPES.has(type) && isPlainObject(fields) ? fields : {};
  return [type, id ?? null, block.id ?? null, block.blockType ?? null];
};

const withoutFieldsOfBlocks = (node: EditorNode): unknown =>
  withoutBlockFields({ root: { children: [node], type: ROOT_NODE_TYPE } }).root;

const isSameFixedNode = (posted: FixedNode, shown: FixedNode, stored: FixedNode): boolean =>
  posted.parentType === shown.parentType &&
  isSameValue(withoutFieldsOfBlocks(posted.node), withoutFieldsOfBlocks(shown.node)) &&
  isSameValue(identityOf(shown.node), identityOf(stored.node));

const withStoredFixedNodes = (
  posted: VeEditorState,
  shown: unknown,
  stored: unknown
): VeEditorState | null => {
  const postedNodes = fixedNodesOf(posted);
  const shownNodes = fixedNodesOf(shown);
  const storedNodes = fixedNodesOf(stored);
  const isSameSequence =
    postedNodes.length === shownNodes.length &&
    postedNodes.length === storedNodes.length &&
    postedNodes.every((fixed, position) =>
      isSameFixedNode(fixed, shownNodes[position] as FixedNode, storedNodes[position] as FixedNode)
    );
  if (!isSameSequence) return null;
  return withFixedNodes(posted, (fixed, position) => storedNodes[position]?.node ?? fixed.node);
};

const isLink = ({ type }: EditorNode): boolean =>
  type === LINK_NODE_TYPE || type === AUTO_LINK_NODE_TYPE;

const storedLinkFieldsOf = (stored: unknown): Map<string, PlainObject> => {
  const fieldsById = new Map<string, PlainObject>();
  forEachEditableNode(stored, (node) => {
    if (isLink(node) && typeof node.id === "string" && isPlainObject(node.fields)) {
      fieldsById.set(node.id, node.fields);
    }
  });
  return fieldsById;
};

const targetOf = (fields: PlainObject): PlainObject =>
  Object.fromEntries(
    TARGET_FIELDS_OF_A_LINK.filter((name) => Object.hasOwn(fields, name)).map((name) => [
      name,
      fields[name],
    ])
  );

const FIELD_AN_INTERNAL_LINK_DROPS = "url";
const FIELD_A_CUSTOM_LINK_DROPS = "doc";

const asPayloadWritesThem = (fields: PlainObject): PlainObject => {
  const dropped =
    fields.linkType === INTERNAL_LINK ? FIELD_AN_INTERNAL_LINK_DROPS : FIELD_A_CUSTOM_LINK_DROPS;
  return Object.fromEntries(Object.entries(fields).filter(([name]) => name !== dropped));
};

const withStoredLinkFields = (posted: VeEditorState, stored: unknown): VeEditorState => {
  const fieldsById = storedLinkFieldsOf(stored);
  return mapEditableNodes(posted, (node) => {
    if (!isLink(node) || !isPlainObject(node.fields)) return node;
    const storedFields = typeof node.id === "string" ? fieldsById.get(node.id) : undefined;
    return { ...node, fields: asPayloadWritesThem({ ...storedFields, ...targetOf(node.fields) }) };
  });
};

const hasOnlyARoot = (state: VeEditorState): boolean =>
  Object.keys(state).every((key) => STATE_KEYS.has(key));

export const editedStateOf = (
  posted: VeEditorState,
  { formats, shown, stored }: EditedStateSources
): VeEditorState | null => {
  const root = rootOf(posted);
  if (!root || !hasOnlyARoot(posted) || hasForbiddenKey(posted)) return null;
  const allowed = withFormats(formats, formatsIn(shown));
  if (!isEditableTree(root, knownIn([shown, stored], allowed))) return null;
  return withStoredFixedNodes(withStoredLinkFields(posted, stored), shown, stored);
};
