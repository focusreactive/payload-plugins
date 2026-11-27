import type { ShownInAFrame } from "./targetSelector.js";

import {
  DATA_VE_FRAME_ATTR,
  DATA_VE_LAYER_ATTR,
  FRAME_IDLE_BORDER,
  FRAME_IDLE_WIDTH,
  FRAME_RADIUS,
} from "./constants.js";
import { clipUnderCovers, measureCovers } from "./covers.js";
import { areaOf, rectOf } from "./targetArea.js";
import { rectInZoomOf } from "./zoom.js";

export const placeFrame = (
  box: HTMLElement,
  target: HTMLElement,
  borderWidth: number,
  covers: ReadonlyMap<Element, DOMRect> = measureCovers()
): void => {
  const rect = rectOf(target);
  const hidden = rect.width === 0 && rect.height === 0;
  box.style.display = hidden ? "none" : "block";
  if (hidden) return;
  const { height, left, top, width } = rectInZoomOf(box, rect);
  const origin = { x: left - borderWidth, y: top - borderWidth };
  box.style.transform = `translate(${origin.x}px, ${origin.y}px)`;
  box.style.width = `${width + borderWidth * 2}px`;
  box.style.height = `${height + borderWidth * 2}px`;
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
export function createFrameLayer(root: Element, isShown: ShownInAFrame): FrameLayer {
  const layer = document.createElement("div");
  layer.setAttribute(DATA_VE_LAYER_ATTR, "frames");
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

  const place = (
    frame: HTMLElement,
    target: HTMLElement,
    covers?: ReadonlyMap<Element, DOMRect>
  ) => {
    if (isShown(target)) placeFrame(frame, target, FRAME_IDLE_WIDTH, covers);
    else frame.style.display = "none";
  };

  const repositionAll = () => {
    frameRequest = 0;
    isShown.forget();
    const covers = measureCovers();
    for (const [target, frame] of frames) {
      place(frame, target, covers);
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
  window.addEventListener("transitionend", schedule, { capture: true, passive: true });
  window.addEventListener("animationend", schedule, { capture: true, passive: true });
  const movesAFrame = (restyled: Node): boolean =>
    [...frames.keys()].some((target) => restyled.contains(target) || target.contains(restyled));
  const restyles = new MutationObserver((records) => {
    if ([...new Set(records.map(({ target }) => target))].some(movesAFrame)) schedule();
  });
  restyles.observe(root, { attributeFilter: ["class", "style"], subtree: true });

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
      layer.append(frame);
      place(frame, target);
      frames.set(target, frame);
      resizes?.observe(areaOf(target));
    },
    remove(target) {
      const frame = frames.get(target);
      if (!frame) return;
      frame.remove();
      frames.delete(target);
      resizes?.unobserve(areaOf(target));
    },
    dispose() {
      if (frameRequest !== 0) cancelAnimationFrame(frameRequest);
      resizes?.disconnect();
      restyles.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("transitionend", schedule, true);
      window.removeEventListener("animationend", schedule, true);
      frames.clear();
      layer.remove();
    },
  };
}
