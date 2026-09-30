import {
  DATA_VE_FOR_ATTR,
  DATA_VE_TARGET_ATTR,
  LABEL_CLASS,
  LABEL_STYLES,
  OUTLINE_STYLE,
} from "./constants.js";

export type EditBadgeConfig = {
  href: string;
  clickHandler: (event: MouseEvent) => void;
  originalOutline: string;
  /** Whether the badge should paint/restore the outline. False when the registry already painted
   *  a persistent outline ('always' mode) — the badge only manages the Edit link then. */
  paintOutline: boolean;
};

export interface EditBadge {
  /** The <a> label element — HoverController references it for the `relatedTarget === label` transition. */
  readonly labelElement: HTMLAnchorElement;
  /** Show the badge anchored to `target`, set its href and click listener, paint the outline. */
  show(target: HTMLElement, config: EditBadgeConfig): void;
  /** Hide the badge and restore the outline that was on the currently-shown target. */
  hide(): void;
  /** Re-position the anchor to the given target's current bounding rect. */
  reposition(target: HTMLElement): void;
  /** Remove the badge DOM and all internally-attached listeners. */
  dispose(): void;
}

// Portal-rendered Edit badge. We deliberately DO NOT append the badge into
// the target's subtree: doing so changes the target's child count and can
// trigger sibling-selector recalculation (Tailwind `space-y-*` / `:last-child`
// margin resets / `* + *` spacing), causing visible layout jumps on hover.
// The layer lives on <body>, uses `position: fixed` with `pointer-events: none`
// (so it never blocks pointer events against real content), and an inner
// `anchor` element is sized/translated to match the active target's
// `getBoundingClientRect()` each time the active target changes.
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
