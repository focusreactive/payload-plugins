import {
  DATA_VE_FRAME_ATTR,
  FRAME_IDLE_BORDER,
  FRAME_IDLE_WIDTH,
  FRAME_RADIUS,
} from "./constants.js";
import { clipUnderCovers, measureCovers } from "./covers.js";

export type TargetBox = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">;

const MAX_MEASURED_DESCENDANTS = 64;

/**
 * The box a target takes on screen. A wrapper around a `fill` image (absolutely positioned inside
 * a parent that gives it its size) has no height of its own, so it is measured by what it holds:
 * without that its frame and badge would never show, though a click on the image still opens it.
 */
export const boxOfTarget = (target: HTMLElement): TargetBox => {
  const own = target.getBoundingClientRect();
  if (own.width > 0 && own.height > 0) return own;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const descendants = target.querySelectorAll("*");
  const count = Math.min(descendants.length, MAX_MEASURED_DESCENDANTS);
  for (let index = 0; index < count; index += 1) {
    const rect = (descendants[index] as Element).getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (left === Infinity) return own;
  return { bottom, height: bottom - top, left, right, top, width: right - left };
};

export const placeFrame = (
  box: HTMLElement,
  target: HTMLElement,
  borderWidth: number,
  covers: ReadonlyMap<Element, DOMRect> = measureCovers()
): void => {
  const rect = boxOfTarget(target);
  const hidden = rect.width === 0 && rect.height === 0;
  box.style.display = hidden ? "none" : "block";
  if (hidden) return;
  const origin = { x: rect.left - borderWidth, y: rect.top - borderWidth };
  box.style.transform = `translate(${origin.x}px, ${origin.y}px)`;
  box.style.width = `${rect.width + borderWidth * 2}px`;
  box.style.height = `${rect.height + borderWidth * 2}px`;
  clipUnderCovers(box, target, origin, covers);
};

export interface FrameLayer {
  add(target: HTMLElement): void;
  remove(target: HTMLElement): void;
  dispose(): void;
}

/**
 * The resting frames of "always" mode: one dashed rectangle per edit target, kept in place on
 * scroll, resize and layout changes. Frames never take pointer events.
 */
export function createFrameLayer(): FrameLayer {
  const layer = document.createElement("div");
  layer.dataset.veLayer = "frames";
  Object.assign(layer.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
    zIndex: "2147483646",
  } as Partial<CSSStyleDeclaration>);
  document.body.append(layer);

  const frames = new Map<HTMLElement, HTMLElement>();
  let frameRequest = 0;

  const repositionAll = () => {
    frameRequest = 0;
    const covers = measureCovers();
    for (const [target, frame] of frames) {
      placeFrame(frame, target, FRAME_IDLE_WIDTH, covers);
    }
  };

  const schedule = () => {
    if (frameRequest !== 0) return;
    frameRequest = requestAnimationFrame(repositionAll);
  };

  const resizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  resizes?.observe(document.documentElement);
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  return {
    add(target) {
      if (frames.has(target)) return;
      const frame = document.createElement("div");
      frame.setAttribute(DATA_VE_FRAME_ATTR, "");
      Object.assign(frame.style, {
        position: "absolute",
        top: "0",
        left: "0",
        boxSizing: "border-box",
        border: FRAME_IDLE_BORDER,
        borderRadius: FRAME_RADIUS,
        pointerEvents: "none",
      } as Partial<CSSStyleDeclaration>);
      placeFrame(frame, target, FRAME_IDLE_WIDTH);
      layer.append(frame);
      frames.set(target, frame);
      resizes?.observe(target);
    },
    remove(target) {
      const frame = frames.get(target);
      if (!frame) return;
      frame.remove();
      frames.delete(target);
      resizes?.unobserve(target);
    },
    dispose() {
      if (frameRequest !== 0) cancelAnimationFrame(frameRequest);
      resizes?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      frames.clear();
      layer.remove();
    },
  };
}
