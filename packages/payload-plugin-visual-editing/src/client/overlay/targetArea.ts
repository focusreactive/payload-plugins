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

const isDrawn = ({ height, width }: DOMRect): boolean => width > 0 || height > 0;

const textRectsOf = (target: HTMLElement): DOMRect[] => {
  const range = target.ownerDocument.createRange();
  range.selectNodeContents(target);
  if (typeof range.getClientRects !== "function") return [];
  return [...range.getClientRects()].filter(isDrawn);
};

const unionOf = ([first, ...rest]: readonly DOMRect[]): DOMRect => {
  let { bottom, left, right, top } = first as DOMRect;
  for (const rect of rest) {
    bottom = Math.max(bottom, rect.bottom);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    top = Math.min(top, rect.top);
  }
  return new DOMRect(left, top, right - left, bottom - top);
};

export const rectOf = (target: HTMLElement): DOMRect => {
  const box = areaOf(target).getBoundingClientRect();
  const drawn = [box, ...textRectsOf(target)].filter(isDrawn);
  return drawn.length === 0 ? box : unionOf(drawn);
};

export const targetWithArea = (area: Element): HTMLElement | null => {
  let inside: Element | null = onlyElementOf(area);
  while (inside && !inside.hasAttribute(DATA_VE_TARGET_ATTR)) inside = onlyElementOf(inside);
  return inside instanceof HTMLElement && areaOf(inside) === area ? inside : null;
};
