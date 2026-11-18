import type { VeEditorState } from "../../shared/protocol.js";

import { isEditableNode } from "../../shared/richText/editableNodes.js";
import { childrenOf, rootOf } from "../../shared/richText/editorNodes.js";
import { ACCENT_VAR, DEFAULT_ACCENT } from "../overlay/constants.js";
import { DATA_VE_EDITING_ATTR } from "./textEditing.js";

export const DATA_VE_EDITED_ATTR = "data-ve-edited";

export const DATA_VE_OPAQUE_ATTR = "data-ve-opaque";

export const DATA_VE_EDIT_STARTING_ATTR = "data-ve-edit-starting";

export const DATA_VE_CARET_ON_ADDED_LINE_ATTR = "data-ve-caret-on-added-line";

const ADDED_LINE_BREAK_ATTR = "data-lexical-managed-linebreak";

const HIDDEN_ADDED_LINE = `:not([${DATA_VE_CARET_ON_ADDED_LINE_ATTR}]) > br:not([${ADDED_LINE_BREAK_ATTR}]) + br[${ADDED_LINE_BREAK_ATTR}]`;

export const ADDED_LINE_STYLE = `[${DATA_VE_EDITING_ATTR}] ${HIDDEN_ADDED_LINE},[${DATA_VE_EDITED_ATTR}] ${HIDDEN_ADDED_LINE}{display:none !important}`;

const STARTING_STYLE_ID = "ve-rich-text-starting-style";
const STARTING_STYLE = `[${DATA_VE_EDIT_STARTING_ATTR}]{outline:2px dashed var(${ACCENT_VAR}, ${DEFAULT_ACCENT}) !important;outline-offset:2px !important;cursor:progress !important}`;

const STYLE_ATTR = "style";
const DISPLAY = "display";
const NOT_DISPLAYED = "none";
const IMPORTANT = "important";
const CARETS_OF_THE_EDITOR = "[data-lexical-cursor], [data-lexical-decorator-boundary]";
const EDITED_ELEMENT = `[${DATA_VE_EDITING_ATTR}]`;
const ATTRS_OF_AN_EDITOR = [
  DATA_VE_EDITING_ATTR,
  "contenteditable",
  "spellcheck",
  "role",
  "tabindex",
  "aria-multiline",
  "data-lexical-editor",
];

const TAGS_OF_A_NODE: ReadonlySet<string> = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "BLOCKQUOTE",
]);

export type Twin = { root: HTMLElement; content: HTMLElement };

const hasTextOfItsOwn = (element: Element): boolean =>
  [...element.childNodes].some(
    (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim() !== ""
  );

const onlyElementIn = (element: HTMLElement): HTMLElement | null => {
  const [only, ...others] = element.children;
  const isAlone = only instanceof HTMLElement && others.length === 0 && !hasTextOfItsOwn(element);
  return isAlone ? only : null;
};

const isRenderedNode = (element: Element): boolean =>
  TAGS_OF_A_NODE.has(element.tagName) || hasTextOfItsOwn(element);

const isEmpty = (element: Element): boolean =>
  element.children.length === 0 && !hasTextOfItsOwn(element);

const isTheOnlyNodeFixed = (state: VeEditorState): boolean => {
  const [first, ...others] = childrenOf(rootOf(state) ?? {});
  return first !== undefined && others.length === 0 && !isEditableNode(first);
};

const holdsNodes = (state: VeEditorState): boolean => childrenOf(rootOf(state) ?? {}).length > 0;

const chainOf = (shown: HTMLElement, state: VeEditorState): HTMLElement[] => {
  const chain = [shown];
  if (isTheOnlyNodeFixed(state)) return chain;
  for (let only = onlyElementIn(shown); only; only = onlyElementIn(only)) {
    if (isRenderedNode(only) || (holdsNodes(state) && isEmpty(only))) return chain;
    chain.push(only);
  }
  return chain;
};

export const contentOf = (shown: HTMLElement, state: VeEditorState): HTMLElement =>
  chainOf(shown, state).at(-1) ?? shown;

const emptyCopyOf = (element: HTMLElement): HTMLElement => {
  const copy = element.ownerDocument.createElement(element.tagName);
  copy.className = element.className;
  return copy;
};

export const twinOf = (wrapper: HTMLElement, state: VeEditorState): Twin => {
  const [root, ...inner] = chainOf(wrapper, state).map(emptyCopyOf) as [
    HTMLElement,
    ...HTMLElement[],
  ];
  let content = root;
  for (const copy of inner) {
    content.append(copy);
    content = copy;
  }
  return { content, root };
};

export const hide = (element: HTMLElement): (() => void) => {
  const display = element.style.getPropertyValue(DISPLAY);
  const priority = element.style.getPropertyPriority(DISPLAY);
  element.style.setProperty(DISPLAY, NOT_DISPLAYED, IMPORTANT);
  return () => {
    if (display === "") element.style.removeProperty(DISPLAY);
    else element.style.setProperty(DISPLAY, display, priority);
    if (element.getAttribute(STYLE_ATTR) === "") element.removeAttribute(STYLE_ATTR);
  };
};

export const showAsStarting = (wrapper: HTMLElement): (() => void) => {
  const doc = wrapper.ownerDocument;
  if (!doc.querySelector(`#${STARTING_STYLE_ID}`)) {
    const style = doc.createElement("style");
    style.id = STARTING_STYLE_ID;
    style.textContent = STARTING_STYLE;
    doc.head.append(style);
  }
  wrapper.setAttribute(DATA_VE_EDIT_STARTING_ATTR, "");
  return () => wrapper.removeAttribute(DATA_VE_EDIT_STARTING_ATTR);
};

export const editableTextsIn = (shown: HTMLElement, leaves: ReadonlySet<Text>): Text[] => {
  const walker = shown.ownerDocument.createTreeWalker(shown, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    if (text.length > 0) texts.push(text);
  }
  const tracked = texts.filter((text) => leaves.has(text));
  if (tracked.length > 0) return tracked;
  return texts.filter((text) => text.parentElement?.closest(`[${DATA_VE_OPAQUE_ATTR}]`) === null);
};

export const readOnlyCopyOf = (twin: HTMLElement): HTMLElement => {
  const copy = twin.cloneNode(true) as HTMLElement;
  const edited = copy.matches(EDITED_ELEMENT)
    ? copy
    : (copy.querySelector<HTMLElement>(EDITED_ELEMENT) ?? copy);
  for (const attr of ATTRS_OF_AN_EDITOR) edited.removeAttribute(attr);
  for (const caret of copy.querySelectorAll(CARETS_OF_THE_EDITOR)) caret.remove();
  for (const block of copy.querySelectorAll(`[${DATA_VE_CARET_ON_ADDED_LINE_ATTR}]`)) {
    block.removeAttribute(DATA_VE_CARET_ON_ADDED_LINE_ATTR);
  }
  copy.setAttribute(DATA_VE_EDITED_ATTR, "");
  return copy;
};
