import {
  DATA_VE_FOR_ATTR,
  DATA_VE_TARGET_ATTR,
  LABEL_CLASS,
  LABEL_STYLES,
  OUTLINE_STYLE,
} from "./constants.js";

type EditBadgeConfig = {
  href: string;
  clickHandler: (event: MouseEvent) => void;
  originalOutline: string;
  paintOutline: boolean;
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

  const anchor = document.createElement("div");
  Object.assign(anchor.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
    transform: "translate(0, 0)",
  } as Partial<CSSStyleDeclaration>);

  const label = document.createElement("a");
  label.textContent = "Edit";
  label.className = LABEL_CLASS;
  label.target = "_blank";
  label.rel = "noopener noreferrer";
  Object.assign(label.style, LABEL_STYLES);

  anchor.append(label);
  layer.append(anchor);
  document.body.append(layer);

  let currentClickHandler: ((event: MouseEvent) => void) | null = null;
  let currentTarget: HTMLElement | null = null;
  let currentOriginalOutline = "";
  let currentPaintedOutline = false;

  const reposition = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    anchor.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    anchor.style.width = `${rect.width}px`;
    anchor.style.height = `${rect.height}px`;
  };

  return {
    get labelElement() {
      return label;
    },
    show(target, config) {
      if (config.paintOutline) {
        target.style.outline = OUTLINE_STYLE;
        currentPaintedOutline = true;
      } else {
        currentPaintedOutline = false;
      }
      reposition(target);
      label.href = config.href;
      label.setAttribute(DATA_VE_FOR_ATTR, target.getAttribute(DATA_VE_TARGET_ATTR) ?? "");
      if (currentClickHandler) label.removeEventListener("click", currentClickHandler);
      label.addEventListener("click", config.clickHandler);
      currentClickHandler = config.clickHandler;
      currentTarget = target;
      currentOriginalOutline = config.originalOutline;
      layer.style.visibility = "visible";
    },
    hide() {
      if (currentTarget) {
        if (currentPaintedOutline) {
          currentTarget.style.outline = currentOriginalOutline;
        }
        currentTarget = null;
        currentOriginalOutline = "";
        currentPaintedOutline = false;
      }
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
