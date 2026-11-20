import {
  DATA_VE_FOR_ATTR,
  DATA_VE_TARGET_ATTR,
  LABEL_CLASS,
  LABEL_ICON_SVG,
  LABEL_STYLES,
  FRAME_ACTIVE_BORDER,
  FRAME_ACTIVE_WIDTH,
  FRAME_RADIUS,
} from "./constants.js";
import { measureCovers } from "./covers.js";
import { boxOfTarget, placeFrame } from "./frameLayer.js";

type EditBadgeConfig = {
  href: string;
  clickHandler: (event: MouseEvent) => void;
};

export interface EditBadge {
  readonly labelElement: HTMLAnchorElement;
  show(target: HTMLElement, config: EditBadgeConfig): void;
  hide(): void;
  reposition(target: HTMLElement): void;
  dispose(): void;
}

type Box = Pick<DOMRect, "top" | "right" | "bottom" | "left">;
type Size = { width: number; height: number };

export type BadgeSide = "above" | "inside" | "below";

export type BadgePlacement = { left: number; top: number; side: BadgeSide };

const overlapsHorizontally = (a: Box, b: Box): boolean => a.left < b.right && b.left < a.right;

/**
 * The top of the part of the viewport where a badge over `target` can be seen: below every cover
 * (a sticky header, `data-ve-cover`) that is pinned to the top of the viewport above the target.
 */
const visibleTopFor = (target: Box, covers: readonly Box[]): number => {
  let top = 0;
  for (const cover of [...covers].sort((a, b) => a.top - b.top)) {
    if (cover.top <= top + 1 && cover.bottom > top && overlapsHorizontally(cover, target)) {
      top = cover.bottom;
    }
  }
  return top;
};

/**
 * Where the badge goes, in viewport coordinates. It sits on the top right corner of the frame like
 * a tab when there is room above the frame. When a sticky header or the top of the viewport takes
 * that room (a heading right under the header, a tall image scrolled half out of view), it hangs
 * inside the visible part of the frame instead, and a frame too short for that gets it below.
 * The badge never leaves the viewport on the right.
 */
export const placeBadge = ({
  badge,
  covers,
  frameWidth,
  target,
  viewport,
}: {
  badge: Size;
  covers: readonly Box[];
  frameWidth: number;
  target: Box;
  viewport: Size;
}): BadgePlacement => {
  const frameTop = target.top - frameWidth;
  const frameBottom = target.bottom + frameWidth;
  const right = Math.min(target.right + frameWidth, viewport.width);
  const left = Math.max(0, right - badge.width);
  const visibleTop = visibleTopFor(target, covers);

  if (frameTop - badge.height >= visibleTop) {
    return { left, side: "above", top: frameTop - badge.height };
  }
  const insideTop = Math.max(frameTop, visibleTop);
  if (frameBottom - insideTop >= badge.height * 2) {
    return { left, side: "inside", top: Math.min(insideTop, frameBottom - badge.height) };
  }
  return { left, side: "below", top: frameBottom };
};

const RADIUS_BY_SIDE: Record<BadgeSide, string> = {
  above: "4px 4px 0 0",
  below: "0 0 4px 4px",
  inside: "0 0 0 4px",
};

const coversOutside = (target: HTMLElement): Box[] =>
  [...measureCovers()]
    .filter(([cover]) => !cover.contains(target) && !target.contains(cover))
    .map(([, rect]) => rect);

export function createEditBadge(): EditBadge {
  const layer = document.createElement("div");
  layer.dataset.veLayer = "true";
  Object.assign(layer.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
    visibility: "hidden",
  } as Partial<CSSStyleDeclaration>);

  // The anchor is the active frame. The badge is its sibling, not its child, so the clip that hides
  // the frame under a cover never hides the badge; `placeBadge` keeps the badge out of covers.
  const anchor = document.createElement("div");
  Object.assign(anchor.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    boxSizing: "border-box",
    border: FRAME_ACTIVE_BORDER,
    borderRadius: FRAME_RADIUS,
    borderTopRightRadius: "0",
    pointerEvents: "none",
    transform: "translate(0, 0)",
  } as Partial<CSSStyleDeclaration>);

  const label = document.createElement("a");
  label.innerHTML = `${LABEL_ICON_SVG}<span>Edit</span>`;
  label.className = LABEL_CLASS;
  label.target = "_blank";
  label.rel = "noopener noreferrer";
  Object.assign(label.style, LABEL_STYLES, { right: "auto", transform: "none" });

  layer.append(anchor, label);
  document.body.append(layer);

  let currentClickHandler: ((event: MouseEvent) => void) | null = null;

  const reposition = (target: HTMLElement) => {
    placeFrame(anchor, target, FRAME_ACTIVE_WIDTH);
    const rect = boxOfTarget(target);
    const hidden = rect.width === 0 && rect.height === 0;
    label.style.display = hidden ? "none" : "inline-flex";
    if (hidden) return;
    const size = label.getBoundingClientRect();
    const { left, side, top } = placeBadge({
      badge: { height: size.height, width: size.width },
      covers: coversOutside(target),
      frameWidth: FRAME_ACTIVE_WIDTH,
      target: rect,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    });
    label.style.transform = `translate(${left}px, ${top}px)`;
    label.style.borderRadius = RADIUS_BY_SIDE[side];
    anchor.style.borderTopRightRadius = side === "above" ? "0" : FRAME_RADIUS;
  };

  return {
    get labelElement() {
      return label;
    },
    show(target, config) {
      reposition(target);
      label.href = config.href;
      label.setAttribute(DATA_VE_FOR_ATTR, target.getAttribute(DATA_VE_TARGET_ATTR) ?? "");
      if (currentClickHandler) label.removeEventListener("click", currentClickHandler);
      label.addEventListener("click", config.clickHandler);
      currentClickHandler = config.clickHandler;
      layer.style.visibility = "visible";
    },
    hide() {
      layer.style.visibility = "hidden";
      if (currentClickHandler) {
        label.removeEventListener("click", currentClickHandler);
        currentClickHandler = null;
      }
    },
    reposition,
    dispose() {
      if (currentClickHandler) {
        label.removeEventListener("click", currentClickHandler);
        currentClickHandler = null;
      }
      layer.remove();
    },
  };
}
