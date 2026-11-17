import { DATA_VE_EDITING_ATTR } from "./textEditing.js";

export const DATA_VE_EDITED_ATTR = "data-ve-edited";

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

export const readOnlyCopyOf = (twin: HTMLElement): HTMLElement => {
  const copy = twin.cloneNode(true) as HTMLElement;
  for (const attr of ATTRS_OF_AN_EDITOR) copy.removeAttribute(attr);
  copy.setAttribute(DATA_VE_EDITED_ATTR, "");
  return copy;
};
