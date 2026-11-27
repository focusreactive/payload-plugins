import { clipsItsContent } from "./targetArea.js";

const HIDDEN_VISIBILITIES: ReadonlySet<string> = new Set(["hidden", "collapse"]);
const NO_FONT_SIZE = "0px";
const NO_OPACITY = "0";
const CLIP_RECT = /^rect\((.+)\)$/u;
const INSET = /^inset\(([^)]*)\)/u;
const ROUND = /\sround\s/u;
const PERCENT = "%";
const AUTO_EDGE = "auto";
const WHOLE_PERCENT = 100;
const PIXEL = 1;

const isClippedAway = (clip: string): boolean => {
  const [, edges] = CLIP_RECT.exec(clip.trim()) ?? [];
  if (edges === undefined || edges.includes(AUTO_EDGE)) return false;
  const [top = 0, right = 0, bottom = 0, left = 0] = edges
    .split(/[\s,]+/u)
    .map((edge) => Number.parseFloat(edge) || 0);
  return top >= bottom || left >= right;
};

const percentOf = (edge: string): number =>
  edge.endsWith(PERCENT) ? Number.parseFloat(edge) || 0 : 0;

const isInsetAway = (clipPath: string): boolean => {
  const [, inset] = INSET.exec(clipPath.trim()) ?? [];
  if (inset === undefined) return false;
  const [edges = ""] = inset.split(ROUND);
  const [top = 0, right = top, bottom = top, left = right] = edges
    .trim()
    .split(/\s+/u)
    .map(percentOf);
  return top + bottom >= WHOLE_PERCENT || left + right >= WHOLE_PERCENT;
};

const isAtMostAPixel = ({ height, width }: DOMRect): boolean => width <= PIXEL || height <= PIXEL;

const hidesItsContent = (style: CSSStyleDeclaration): boolean =>
  style.opacity === NO_OPACITY || isClippedAway(style.clip) || isInsetAway(style.clipPath);

const squeezesItsContent = (element: Element): boolean => {
  if (!clipsItsContent(element)) return false;
  const { height, width } = element.getBoundingClientRect();
  return width <= PIXEL && height <= PIXEL;
};

const hasLettersTooSmall = (textNode: Text): boolean => {
  const range = textNode.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  if (typeof range.getClientRects !== "function") return false;
  const rects = [...range.getClientRects()];
  return rects.length > 0 && rects.every(isAtMostAPixel);
};

export const isDrawnText = (textNode: Text, target: Element, boundary: Element): boolean => {
  const parent = textNode.parentElement;
  const view = textNode.ownerDocument.defaultView;
  if (!parent || !view) return true;
  const parentStyle = view.getComputedStyle(parent);
  if (HIDDEN_VISIBILITIES.has(parentStyle.visibility) || parentStyle.fontSize === NO_FONT_SIZE)
    return false;
  let isInsideTarget = true;
  for (let element: Element | null = parent; element && boundary.contains(element); ) {
    if (hidesItsContent(view.getComputedStyle(element))) return false;
    if (isInsideTarget && squeezesItsContent(element)) return false;
    if (element === target) isInsideTarget = false;
    element = element.parentElement;
  }
  return !hasLettersTooSmall(textNode);
};
