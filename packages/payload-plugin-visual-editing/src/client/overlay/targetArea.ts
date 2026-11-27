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

const CLIPPING_OVERFLOWS: ReadonlySet<string> = new Set(["auto", "clip", "hidden", "scroll"]);

const holdsText = (target: HTMLElement): boolean => {
  const texts = target.ownerDocument.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  while (texts.nextNode()) {
    if (!isBlank(texts.currentNode)) return true;
  }
  return false;
};

const rangesOfDocuments = new WeakMap<Document, Range>();

const rangeIn = (doc: Document): Range => {
  const range = rangesOfDocuments.get(doc) ?? doc.createRange();
  rangesOfDocuments.set(doc, range);
  return range;
};

const isWithin = (rect: DOMRect, box: DOMRect): boolean =>
  rect.left >= box.left &&
  rect.right <= box.right &&
  rect.top >= box.top &&
  rect.bottom <= box.bottom;

export const clipsItsContent = (element: Element): boolean => {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return (
    style !== undefined &&
    (CLIPPING_OVERFLOWS.has(style.overflowX) || CLIPPING_OVERFLOWS.has(style.overflowY))
  );
};

const clipOf = (target: HTMLElement): DOMRect | null => {
  for (let element: Element | null = target; element; element = element.parentElement) {
    if (clipsItsContent(element)) return element.getBoundingClientRect();
  }
  return null;
};

const clippedTo = (clip: DOMRect, rect: DOMRect): DOMRect => {
  const left = Math.max(rect.left, clip.left);
  const top = Math.max(rect.top, clip.top);
  const right = Math.min(rect.right, clip.right);
  const bottom = Math.min(rect.bottom, clip.bottom);
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
};

const textRectsOf = (target: HTMLElement, box: DOMRect): DOMRect[] => {
  if (!holdsText(target)) return [];
  const range = rangeIn(target.ownerDocument);
  range.selectNodeContents(target);
  if (typeof range.getClientRects !== "function") return [];
  const rects = [...range.getClientRects()].filter(isDrawn);
  if (rects.every((rect) => isWithin(rect, box))) return [];
  const clip = clipOf(target);
  if (!clip) return rects;
  return rects
    .map((rect) => clippedTo(clip, rect))
    .filter(({ height, width }) => width > 0 && height > 0);
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
  const drawn = [box, ...textRectsOf(target, box)].filter(isDrawn);
  return drawn.length === 0 ? box : unionOf(drawn);
};

export const targetWithArea = (area: Element): HTMLElement | null => {
  let inside: Element | null = onlyElementOf(area);
  while (inside && !inside.hasAttribute(DATA_VE_TARGET_ATTR)) inside = onlyElementOf(inside);
  return inside instanceof HTMLElement && areaOf(inside) === area ? inside : null;
};
