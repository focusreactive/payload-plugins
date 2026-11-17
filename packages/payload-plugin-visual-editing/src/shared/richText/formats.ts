import type { VeRichTextFormats } from "../protocol.js";
import type { EditorNode } from "./editorNodes.js";

import {
  AUTO_LINK_NODE_TYPE,
  forEachEditableNode,
  HEADING_NODE_TYPE,
  LINK_NODE_TYPE,
  LIST_NODE_TYPE,
  QUOTE_NODE_TYPE,
  TAB_NODE_TYPE,
  TEXT_NODE_TYPE,
} from "./editableNodes.js";

export type { VeRichTextFormats } from "../protocol.js";

export const BOLD_FORMAT = 1;
export const ITALIC_FORMAT = 2;
export const STRIKETHROUGH_FORMAT = 4;
export const UNDERLINE_FORMAT = 8;
export const CODE_FORMAT = 16;
export const SUBSCRIPT_FORMAT = 32;
export const SUPERSCRIPT_FORMAT = 64;
export const EVERY_TEXT_FORMAT = 2047;

export const HEADING_TAGS: readonly string[] = ["h1", "h2", "h3", "h4", "h5", "h6"];

export const BULLET_LIST = "bullet";
export const NUMBERED_LIST = "number";
export const CHECK_LIST = "check";

export const LIST_TYPES: readonly string[] = [BULLET_LIST, NUMBERED_LIST, CHECK_LIST];

export const NO_FORMATS: VeRichTextFormats = {
  hasLinks: false,
  hasQuotes: false,
  headings: [],
  lists: [],
  textFormats: 0,
};

const isTextFormats = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= EVERY_TEXT_FORMAT;

const namesAmong = (value: unknown, names: readonly string[]): string[] =>
  Array.isArray(value) ? names.filter((name) => value.includes(name)) : [];

export const readFormats = (value: unknown): VeRichTextFormats | null => {
  if (typeof value !== "object" || value === null) return null;
  const { hasLinks, hasQuotes, headings, lists, textFormats } = value as Record<string, unknown>;
  if (!isTextFormats(textFormats)) return null;
  return {
    hasLinks: hasLinks === true,
    hasQuotes: hasQuotes === true,
    headings: namesAmong(headings, HEADING_TAGS),
    lists: namesAmong(lists, LIST_TYPES),
    textFormats,
  };
};

export const withFormats = (
  one: VeRichTextFormats,
  other: VeRichTextFormats
): VeRichTextFormats => ({
  hasLinks: one.hasLinks || other.hasLinks,
  hasQuotes: one.hasQuotes || other.hasQuotes,
  headings: HEADING_TAGS.filter(
    (tag) => one.headings.includes(tag) || other.headings.includes(tag)
  ),
  lists: LIST_TYPES.filter((type) => one.lists.includes(type) || other.lists.includes(type)),
  textFormats: one.textFormats | other.textFormats,
});

const textFormatsOf = ({ format, textFormat, type }: EditorNode): number => {
  const ofText = type === TEXT_NODE_TYPE || type === TAB_NODE_TYPE ? format : textFormat;
  return isTextFormats(ofText) ? ofText : 0;
};

const formatsOfNode = (node: EditorNode): VeRichTextFormats => ({
  hasLinks: node.type === LINK_NODE_TYPE || node.type === AUTO_LINK_NODE_TYPE,
  hasQuotes: node.type === QUOTE_NODE_TYPE,
  headings: node.type === HEADING_NODE_TYPE ? namesAmong([node.tag], HEADING_TAGS) : [],
  lists: node.type === LIST_NODE_TYPE ? namesAmong([node.listType], LIST_TYPES) : [],
  textFormats: textFormatsOf(node),
});

export const formatsIn = (state: unknown): VeRichTextFormats => {
  let formats = NO_FORMATS;
  forEachEditableNode(state, (node) => {
    formats = withFormats(formats, formatsOfNode(node));
  });
  return formats;
};
