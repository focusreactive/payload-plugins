import { rectOf } from "./targetArea.js";

type Point = { x: number; y: number };

type Measured = readonly [HTMLElement, DOMRect];

export interface TargetsAtPoint {
  innermostAt(point: Point): HTMLElement | null;
  dispose(): void;
}

const holds = ({ bottom, height, left, right, top, width }: DOMRect, { x, y }: Point) =>
  width > 0 && height > 0 && x >= left && x <= right && y >= top && y <= bottom;

const isAfter = (one: HTMLElement, other: HTMLElement): boolean =>
  (other.compareDocumentPosition(one) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

const paintedOrderAt = ({ x, y }: Point, doc: Document): Element[] =>
  typeof doc.elementsFromPoint === "function" ? doc.elementsFromPoint(x, y) : [];

const topmostOf = (hits: readonly HTMLElement[], point: Point): HTMLElement | null => {
  const [first, ...rest] = hits;
  if (!first || rest.length === 0) return first ?? null;
  const painted = paintedOrderAt(point, first.ownerDocument);
  const depthOf = (hit: HTMLElement) => painted.findIndex((element) => hit.contains(element));
  return hits.reduce((top, hit) => {
    const [hitDepth, topDepth] = [depthOf(hit), depthOf(top)];
    if (hitDepth === -1 || topDepth === -1 || hitDepth === topDepth) {
      return isAfter(hit, top) ? hit : top;
    }
    return hitDepth < topDepth ? hit : top;
  });
};

export function createTargetsAtPoint(targets: () => HTMLElement[]): TargetsAtPoint {
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
      const hits = measure().flatMap(([target, rect]) => (holds(rect, point) ? [target] : []));
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
