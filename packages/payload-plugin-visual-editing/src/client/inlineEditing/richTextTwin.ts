import { ACCENT_VAR, DEFAULT_ACCENT } from "../overlay/constants.js";
import { DATA_VE_EDITING_ATTR } from "./textEditing.js";

export const DATA_VE_EDITED_ATTR = "data-ve-edited";

export const DATA_VE_OPAQUE_ATTR = "data-ve-opaque";

export const DATA_VE_EDIT_STARTING_ATTR = "data-ve-edit-starting";

const STARTING_STYLE_ID = "ve-rich-text-starting-style";
const STARTING_STYLE = `[${DATA_VE_EDIT_STARTING_ATTR}]{outline:2px dashed var(${ACCENT_VAR}, ${DEFAULT_ACCENT}) !important;outline-offset:2px !important;cursor:progress !important}`;

const STYLE_ATTR = "style";
const DISPLAY = "display";
const NOT_DISPLAYED = "none";
const IMPORTANT = "important";
const ATTRS_OF_AN_EDITOR = [
  DATA_VE_EDITING_ATTR,
  "contenteditable",
  "spellcheck",
  "role",
  "tabindex",
  "aria-multiline",
  "data-lexical-editor",
];

export const twinOf = (wrapper: HTMLElement): HTMLElement => {
  const twin = wrapper.ownerDocument.createElement(wrapper.tagName);
  twin.className = wrapper.className;
  return twin;
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
  for (const attr of ATTRS_OF_AN_EDITOR) copy.removeAttribute(attr);
  copy.setAttribute(DATA_VE_EDITED_ATTR, "");
  return copy;
};
