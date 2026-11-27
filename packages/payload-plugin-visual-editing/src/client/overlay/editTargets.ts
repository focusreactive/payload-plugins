import type { ActionOf } from "./editBadge.js";
import type { FieldMatch, FieldTracker } from "./fieldTracker.js";
import type { Marker } from "./markerExtractor.js";
import type { Point } from "./targetsAtPoint.js";
import type { TargetConfig, TargetRegistryCtx } from "./targetRegistry.js";

import { DATA_VE_PATH_ATTR } from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { DATA_VE_LAYER_ATTR, LABEL_CLASS } from "./constants.js";
import { isDrawnText } from "./drawnText.js";
import { createEditBadge } from "./editBadge.js";
import { createFrameLayer } from "./frameLayer.js";
import { rectOf, shownRectsOfTexts } from "./targetArea.js";
import { createHoverController } from "./hoverController.js";
import { groupNodesByPath, readMarkerFromAttrs } from "./markerExtractor.js";
import { createTargetRegistry } from "./targetRegistry.js";
import { findTargetAncestor, pickTargetForGroup, shownOncePerFrame } from "./targetSelector.js";
import { createTargetsAtPoint, holds, pointOf } from "./targetsAtPoint.js";

export const CLICK_LEFT_TO_THE_PAGE = "page";

export type ClickTaken = boolean | typeof CLICK_LEFT_TO_THE_PAGE;

export type EditTargetsCtx = TargetRegistryCtx & {
  mode: "always" | "hover";
  editInPlace?: (target: HTMLElement, event: MouseEvent, openField: () => void) => ClickTaken;
  actionOf?: ActionOf;
};

const isPlainPrimaryClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const isActivatedByTheKeyboard = (event: MouseEvent) => event.detail === 0;

const hasTextSelection = () => document.getSelection()?.isCollapsed === false;

const INTERACTIVE = [
  "a",
  "audio",
  "button",
  "input",
  "label",
  "select",
  "summary",
  "textarea",
  "video",
  "[contenteditable]",
  "[role=button]",
  "[role=link]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const MEDIA = "audio, canvas, iframe, img, object, picture, svg, video";

const holdsContent = (element: Element): boolean =>
  (element.textContent ?? "").trim() !== "" ||
  element.matches(MEDIA) ||
  element.querySelector(MEDIA) !== null;

const isPassedThrough = (element: Element, target: HTMLElement): boolean =>
  element.contains(target) || !holdsContent(element);

const mediaOf = (control: Element): Element[] =>
  control.matches(MEDIA) ? [control] : Array.from(control.querySelectorAll(MEDIA));

const drawsTextAt = (control: Element, point: Point): boolean => {
  const doc = control.ownerDocument;
  const texts = doc.createTreeWalker(control, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  if (typeof range.getClientRects !== "function") return false;
  while (texts.nextNode()) {
    const text = texts.currentNode as Text;
    if (!isDrawnText(text, control, control)) continue;
    range.selectNodeContents(text);
    if ([...range.getClientRects()].some((rect) => holds(rect, point))) return true;
  }
  return false;
};

const NONE: ReadonlySet<string> = new Set(["", "none", "normal"]);

const EMPTY_TEXT: ReadonlySet<string> = new Set(['""', "''"]);

const PSEUDO_ELEMENTS = ["::before", "::after"];

const TRANSPARENT = "transparent";

const COLOR_CHANNELS = /\(([^)]*)\)/u;

const CHANNEL_SEPARATORS = /[\s,/]+/u;

const OPAQUE_CHANNELS = 3;

const HIDDEN_BORDER_STYLES: ReadonlySet<string> = new Set(["", "none", "hidden"]);

const BORDER_SIDES = ["top", "right", "bottom", "left"] as const;

const isVisibleColor = (color = ""): boolean => {
  if (color === "" || color === TRANSPARENT) return false;
  const [, channels = ""] = COLOR_CHANNELS.exec(color) ?? [];
  const values = channels.trim().split(CHANNEL_SEPARATORS);
  if (values.length <= OPAQUE_CHANNELS) return true;
  const alpha = values.at(-1) ?? "";
  return Number.parseFloat(alpha) > 0;
};

const paintsABorder = (style: CSSStyleDeclaration): boolean =>
  BORDER_SIDES.some(
    (side) =>
      Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
      !HIDDEN_BORDER_STYLES.has(style.getPropertyValue(`border-${side}-style`)) &&
      isVisibleColor(style.getPropertyValue(`border-${side}-color`))
  );

const paints = (style: CSSStyleDeclaration): boolean =>
  !NONE.has(style.backgroundImage) ||
  !NONE.has(style.maskImage) ||
  isVisibleColor(style.backgroundColor) ||
  !NONE.has(style.boxShadow) ||
  paintsABorder(style);

const pseudoElementPaints = (style: CSSStyleDeclaration): boolean =>
  !NONE.has(style.content) && (!EMPTY_TEXT.has(style.content) || paints(style));

const paintsItself = (control: Element): boolean => {
  const view = control.ownerDocument.defaultView;
  if (!view) return false;
  return (
    paints(view.getComputedStyle(control)) ||
    PSEUDO_ELEMENTS.some((pseudo) => pseudoElementPaints(view.getComputedStyle(control, pseudo)))
  );
};

const drawsAt = (control: Element, point: Point): boolean =>
  (paintsItself(control) && holds(control.getBoundingClientRect(), point)) ||
  mediaOf(control).some((media) => holds(media.getBoundingClientRect(), point)) ||
  drawsTextAt(control, point);

const TEXT_HIT_MARGIN_PX = 4;

const grownBy = (margin: number, { height, left, top, width }: DOMRect): DOMRect =>
  new DOMRect(left - margin, top - margin, width + margin * 2, height + margin * 2);

const elementOf = (event: MouseEvent): Element | null =>
  event.target instanceof Element ? event.target : null;

const isOfTheOverlay = (element: Element): boolean =>
  element.closest(`[${DATA_VE_LAYER_ATTR}]`) !== null;

const isRepeatedClick = (event: MouseEvent) => event.detail > 1;

const addressesSameField = (bound: TargetConfig, marker: Marker) =>
  bound.path === marker.path &&
  bound.key === marker.key &&
  bound.locale === marker.locale &&
  bound.documentAddress === documentAddressOf(marker);

const pathWrappersIn = (root: Element): HTMLElement[] => {
  const wrappers = Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_VE_PATH_ATTR}]`));
  return root.matches(`[${DATA_VE_PATH_ATTR}]`) ? [root as HTMLElement, ...wrappers] : wrappers;
};

const removeLabelsLeftBySkippedCleanup = () => {
  for (const leftover of Array.from(document.querySelectorAll<HTMLElement>(`.${LABEL_CLASS}`))) {
    leftover.remove();
  }
};

export function createEditTargets(
  main: HTMLElement,
  tracker: FieldTracker,
  getCtx: () => EditTargetsCtx
): () => void {
  removeLabelsLeftBySkippedCleanup();

  const registry = createTargetRegistry();
  const badge = createEditBadge();
  const textsOfTargets = new WeakMap<HTMLElement, readonly Text[]>();
  const isShown = (target: HTMLElement): boolean => {
    const texts = textsOfTargets.get(target);
    return texts === undefined || texts.some((text) => isDrawnText(text, target, main));
  };
  const textHitAreaOf = (target: HTMLElement): DOMRect[] =>
    shownRectsOfTexts(target, textsOfTargets.get(target) ?? []).map((rect) =>
      grownBy(TEXT_HIT_MARGIN_PX, rect)
    );
  const hitAreaOf = (target: HTMLElement): readonly DOMRect[] => {
    const textArea = textHitAreaOf(target);
    return textArea.length > 0 ? textArea : [rectOf(target)];
  };
  const isShownInThisFrame = shownOncePerFrame(isShown);
  const targetsAtPoint = createTargetsAtPoint(registry.targets, isShownInThisFrame, hitAreaOf);
  const pointedTarget = (target: HTMLElement, point: Point): HTMLElement => {
    const textArea = textHitAreaOf(target);
    if (textArea.length === 0 || textArea.some((rect) => holds(rect, point))) return target;
    const beneath = targetsAtPoint.innermostAt(point);
    return beneath && !beneath.contains(target) ? beneath : target;
  };
  const hover = createHoverController(
    badge,
    registry,
    (target) => getCtx().actionOf?.(target) ?? null,
    isShown,
    pointedTarget
  );
  const frames = getCtx().mode === "always" ? createFrameLayer(main, isShownInThisFrame) : null;
  const wrapperTargets = new Set<HTMLElement>();

  const targetBeneath = (element: Element, point: Point): HTMLElement | null => {
    if (element.closest(INTERACTIVE)) return null;
    const target = targetsAtPoint.innermostAt(point);
    return target && isPassedThrough(element, target) ? target : null;
  };

  const hoveredTarget = (element: Element, point: Point): HTMLElement | null => {
    const ancestor = findTargetAncestor(element, isShown);
    if (ancestor) return pointedTarget(ancestor, point);
    const control = element.closest(INTERACTIVE);
    if (!control) return targetBeneath(element, point);
    return drawsAt(control, point) ? null : targetsAtPoint.innermostAt(point);
  };

  const targetUnder = (event: MouseEvent): HTMLElement | null => {
    const element = elementOf(event);
    if (!element || isOfTheOverlay(element)) return null;
    return hoveredTarget(element, pointOf(event));
  };

  const hoverTargetBeneath = (event: MouseEvent) => {
    const element = elementOf(event);
    if (!element) return;
    if (isOfTheOverlay(element)) {
      hover.pointAtLayer(element);
      return;
    }
    const point = pointOf(event);
    hover.point(hoveredTarget(element, point), point);
  };

  const registerTarget = (target: HTMLElement, marker: Marker) => {
    const existing = registry.get(target);
    if (existing && addressesSameField(existing, marker)) return;
    registry.upsert(target, marker, getCtx());
    if (existing) {
      hover.refresh(target);
    } else {
      hover.attach(target);
      frames?.add(target);
    }
  };

  const releaseTarget = (target: HTMLElement) => {
    hover.detach(target);
    frames?.remove(target);
    registry.remove(target);
    wrapperTargets.delete(target);
  };

  const releaseWrappersWithoutMarkerIn = (root: Element) => {
    for (const wrapper of wrapperTargets) {
      if (root.contains(wrapper) && readMarkerFromAttrs(wrapper) === null) releaseTarget(wrapper);
    }
  };

  const registerTargetsIn = (root: Element, matches: readonly FieldMatch[]) => {
    releaseWrappersWithoutMarkerIn(root);

    const fieldMatches = matches.filter(({ richText }) => richText === undefined);
    for (const { nodes, ctx: marker } of groupNodesByPath(fieldMatches)) {
      const target = pickTargetForGroup(nodes, main);
      if (!(target instanceof HTMLElement)) continue;
      textsOfTargets.set(target, nodes);
      registerTarget(target, marker);
    }

    for (const wrapper of pathWrappersIn(root)) {
      const marker = readMarkerFromAttrs(wrapper);
      if (!marker) continue;
      registerTarget(wrapper, marker);
      wrapperTargets.add(wrapper);
    }
  };

  const releaseTargetsThatLeft = () => {
    for (const target of registry.targets()) {
      if (!main.contains(target)) releaseTarget(target);
    }
  };

  const stopTracking = tracker.subscribe({
    onContentRemoved: releaseTargetsThatLeft,
    onFields: registerTargetsIn,
  });

  const openFieldOnTargetClick = (event: MouseEvent) => {
    if (!isPlainPrimaryClick(event) || isActivatedByTheKeyboard(event)) return;
    const target = targetUnder(event);
    const config = target ? registry.get(target) : undefined;
    if (!target || !config) return;
    const taken = getCtx().editInPlace?.(target, event, () => config.clickHandler(event));
    if (taken === CLICK_LEFT_TO_THE_PAGE) return;
    if (taken) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (isRepeatedClick(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (hasTextSelection()) return;
    event.stopPropagation();
    config.clickHandler(event);
  };
  main.addEventListener("click", openFieldOnTargetClick, true);
  main.addEventListener("pointermove", hoverTargetBeneath, true);

  return () => {
    main.removeEventListener("click", openFieldOnTargetClick, true);
    main.removeEventListener("pointermove", hoverTargetBeneath, true);
    targetsAtPoint.dispose();
    stopTracking();
    hover.dispose();
    frames?.dispose();
    registry.disposeAll();
    badge.dispose();
  };
}
