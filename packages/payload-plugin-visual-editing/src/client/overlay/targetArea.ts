import { DATA_VE_PATH_ATTR } from "../../shared/protocol.js";
import { DATA_VE_TARGET_ATTR } from "./constants.js";

const INLINE = "inline";

const isInline = (element: Element): boolean =>
  element.ownerDocument.defaultView?.getComputedStyle(element).display === INLINE;

const isBlank = (node: Node): boolean =>
  node.nodeType === Node.COMMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() === "");

const onlyElementOf = (parent: Element): Element | null => {
  const [only, ...others] = [...parent.childNodes].filter((node) => !isBlank(node));
  return only instanceof Element && others.length === 0 ? only : null;
};

const isFieldOfItsOwn = (element: Element): boolean =>
  element.hasAttribute(DATA_VE_TARGET_ATTR) || element.hasAttribute(DATA_VE_PATH_ATTR);

const widerAreaOf = (area: HTMLElement): HTMLElement | null => {
  const parent = area.parentElement;
  if (!parent || parent === area.ownerDocument.body || isFieldOfItsOwn(parent)) return null;
  return onlyElementOf(parent) === area ? parent : null;
};

export const areaOf = (target: HTMLElement): HTMLElement => {
  let area = target;
  while (isInline(area)) {
    const wider = widerAreaOf(area);
    if (!wider) return area;
    area = wider;
  }
  return area;
};

export const rectOf = (target: HTMLElement): DOMRect => areaOf(target).getBoundingClientRect();

export const targetWithArea = (area: Element): HTMLElement | null => {
  let inside: Element | null = onlyElementOf(area);
  while (inside && !inside.hasAttribute(DATA_VE_TARGET_ATTR)) inside = onlyElementOf(inside);
  return inside instanceof HTMLElement && areaOf(inside) === area ? inside : null;
};
