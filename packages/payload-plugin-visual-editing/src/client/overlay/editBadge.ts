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
import { placeFrame } from "./frameLayer.js";

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

  // The anchor is the active frame; the badge sits on its top right corner like a tab.
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
  Object.assign(label.style, LABEL_STYLES, { right: `-${FRAME_ACTIVE_WIDTH}px` });

  anchor.append(label);
  layer.append(anchor);
  document.body.append(layer);

  let currentClickHandler: ((event: MouseEvent) => void) | null = null;

  const reposition = (target: HTMLElement) => {
    placeFrame(anchor, target.getBoundingClientRect(), FRAME_ACTIVE_WIDTH);
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
