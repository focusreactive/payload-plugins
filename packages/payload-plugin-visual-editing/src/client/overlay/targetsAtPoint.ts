import type { IsShown } from "./targetSelector.js";

import { rectOf } from "./targetArea.js";

export type Point = { x: number; y: number };

export const pointOf = (event: MouseEvent): Point => ({ x: event.clientX, y: event.clientY });

type Measured = readonly [HTMLElement, DOMRect];

export interface TargetsAtPoint {
  innermostAt(point: Point): HTMLElement | null;
  dispose(): void;
}

export const holds = ({ bottom, height, left, right, top, width }: DOMRect, { x, y }: Point) =>
  width > 0 && height > 0 && x >= left && x <= right && y >= top && y <= bottom;

const isAfter = (one: HTMLElement, other: HTMLElement): boolean =>
  (other.compareDocumentPosition(one) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

const POSITIONED: ReadonlySet<string> = new Set(["absolute", "fixed", "relative", "sticky"]);

type Stacking = readonly [zIndex: number, isPositioned: number];

const commonAncestorOf = (one: Element, other: Element): Element | null => {
  let ancestor = one.parentElement;
  while (ancestor && !ancestor.contains(other)) ancestor = ancestor.parentElement;
  return ancestor;
};

const STACKING_POSITIONS: ReadonlySet<string> = new Set(["fixed", "sticky"]);
const FLEX_OR_GRID = /(?:flex|grid)$/u;
const STACKING_WILL_CHANGE = /transform|opacity|filter|isolation|perspective|z-index|position/u;
const STACKING_CONTAIN = /layout|paint|strict|content/u;
const AUTO = "auto";
const NONE = "none";
const ISOLATE = "isolate";

const NORMAL = "normal";
const SIZE_CONTAINER = /size/u;
const STACKING_WHEN_SET = ["clip-path", "mask-image", "backdrop-filter"] as const;

const isSet = (value: string): boolean => value !== "" && value !== NONE;

const isBlended = (value: string): boolean => value !== "" && value !== NORMAL;

const createsStackingContext = (style: CSSStyleDeclaration, parent: CSSStyleDeclaration | null) =>
  (style.zIndex !== AUTO &&
    (POSITIONED.has(style.position) || FLEX_OR_GRID.test(parent?.display ?? ""))) ||
  STACKING_POSITIONS.has(style.position) ||
  Number.parseFloat(style.opacity) < 1 ||
  isSet(style.transform) ||
  isSet(style.filter) ||
  style.isolation === ISOLATE ||
  STACKING_WILL_CHANGE.test(style.willChange) ||
  STACKING_CONTAIN.test(style.contain) ||
  STACKING_WHEN_SET.some((property) => isSet(style.getPropertyValue(property))) ||
  isBlended(style.getPropertyValue("mix-blend-mode")) ||
  SIZE_CONTAINER.test(style.getPropertyValue("container-type"));

const stackingOf = (element: Element, below: Element | null): Stacking => {
  const view = element.ownerDocument.defaultView;
  if (!view) return [0, 0];
  let stacking: Stacking = [0, 0];
  for (let current: Element | null = element; current && current !== below; ) {
    const style = view.getComputedStyle(current);
    const parent = current.parentElement ? view.getComputedStyle(current.parentElement) : null;
    if (createsStackingContext(style, parent)) {
      stacking = [Number.parseInt(style.zIndex, 10) || 0, 1];
    } else if (POSITIONED.has(style.position)) {
      stacking = [stacking[0], 1];
    }
    current = current.parentElement;
  }
  return stacking;
};

const stackedAbove = (one: HTMLElement, other: HTMLElement): number => {
  const below = commonAncestorOf(one, other);
  const [oneZIndex, oneIsPositioned] = stackingOf(one, below);
  const [otherZIndex, otherIsPositioned] = stackingOf(other, below);
  return oneZIndex - otherZIndex || oneIsPositioned - otherIsPositioned;
};

const paintedOrderAt = ({ x, y }: Point, doc: Document): Element[] =>
  typeof doc.elementsFromPoint === "function" ? doc.elementsFromPoint(x, y) : [];

const topmostOf = (hits: readonly HTMLElement[], point: Point): HTMLElement | null => {
  const [first, ...rest] = hits;
  if (!first || rest.length === 0) return first ?? null;
  const painted = paintedOrderAt(point, first.ownerDocument);
  const depthOf = (hit: HTMLElement) => painted.findIndex((element) => hit.contains(element));
  return hits.reduce((top, hit) => {
    const [hitDepth, topDepth] = [depthOf(hit), depthOf(top)];
    if (hitDepth === topDepth) return isAfter(hit, top) ? hit : top;
    if (hitDepth !== -1 && topDepth !== -1) return hitDepth < topDepth ? hit : top;
    const stacking = stackedAbove(hit, top);
    if (stacking !== 0) return stacking > 0 ? hit : top;
    return hitDepth === -1 ? top : hit;
  });
};

export function createTargetsAtPoint(
  targets: () => HTMLElement[],
  isShown: IsShown
): TargetsAtPoint {
  let measured: Measured[] | null = null;
  let frameRequest = 0;

  const forget = () => {
    measured = null;
    frameRequest = 0;
  };

  const measure = (): Measured[] => {
    if (measured) return measured;
    measured = targets().map((target) => [target, rectOf(target)] as const);
    frameRequest = requestAnimationFrame(forget);
    return measured;
  };

  return {
    innermostAt(point) {
      const hits = measure().flatMap(([target, rect]) =>
        holds(rect, point) && isShown(target) ? [target] : []
      );
      return topmostOf(
        hits.filter((hit) => !hits.some((other) => other !== hit && hit.contains(other))),
        point
      );
    },
    dispose() {
      if (frameRequest !== 0) cancelAnimationFrame(frameRequest);
      forget();
    },
  };
}
