import { rectOf } from "./targetArea.js";

type Point = { x: number; y: number };

type Measured = readonly [HTMLElement, DOMRect];

export interface TargetsAtPoint {
  innermostAt(point: Point): HTMLElement | null;
  dispose(): void;
}

const holds = ({ bottom, height, left, right, top, width }: DOMRect, { x, y }: Point) =>
  width > 0 && height > 0 && x >= left && x <= right && y >= top && y <= bottom;

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
      return (
        hits.find((hit) => !hits.some((other) => other !== hit && hit.contains(other))) ?? null
      );
    },
    dispose() {
      if (frameRequest !== 0) cancelAnimationFrame(frameRequest);
      forget();
    },
  };
}
