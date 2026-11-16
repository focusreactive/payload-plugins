import {
  DATA_VE_FRAME_ATTR,
  FRAME_IDLE_BORDER,
  FRAME_IDLE_WIDTH,
  FRAME_RADIUS,
} from "./constants.js";

/** Places a box so its border lies just outside `rect`. */
export const placeFrame = (box: HTMLElement, rect: DOMRect, borderWidth: number): void => {
  const hidden = rect.width === 0 && rect.height === 0;
  box.style.display = hidden ? "none" : "block";
  if (hidden) return;
  box.style.transform = `translate(${rect.left - borderWidth}px, ${rect.top - borderWidth}px)`;
  box.style.width = `${rect.width + borderWidth * 2}px`;
  box.style.height = `${rect.height + borderWidth * 2}px`;
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
    for (const [target, frame] of frames) {
      placeFrame(frame, target.getBoundingClientRect(), FRAME_IDLE_WIDTH);
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
      placeFrame(frame, target.getBoundingClientRect(), FRAME_IDLE_WIDTH);
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
