import type { ActionOf } from "./editBadge.js";
import type { FieldMatch, FieldTracker } from "./fieldTracker.js";
import type { Marker } from "./markerExtractor.js";
import type { TargetConfig, TargetRegistryCtx } from "./targetRegistry.js";

import { DATA_VE_PATH_ATTR } from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { LABEL_CLASS } from "./constants.js";
import { createEditBadge } from "./editBadge.js";
import { createFrameLayer } from "./frameLayer.js";
import { createHoverController } from "./hoverController.js";
import { groupNodesByPath, readMarkerFromAttrs } from "./markerExtractor.js";
import { createTargetRegistry } from "./targetRegistry.js";
import { findTargetAncestor, pickTargetForGroup } from "./targetSelector.js";
import { createTargetsAtPoint } from "./targetsAtPoint.js";

export const CLICK_LEFT_TO_THE_PAGE = "page";

export type ClickTaken = boolean | typeof CLICK_LEFT_TO_THE_PAGE;

export type EditTargetsCtx = TargetRegistryCtx & {
  mode: "always" | "hover";
  editInPlace?: (target: HTMLElement, event: MouseEvent, openField: () => void) => ClickTaken;
  actionOf?: ActionOf;
};

const isPlainPrimaryClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

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

const pointOf = (event: MouseEvent) => ({ x: event.clientX, y: event.clientY });

const elementOf = (event: MouseEvent): Element | null =>
  event.target instanceof Element ? event.target : null;

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
  const hover = createHoverController(
    badge,
    registry,
    (target) => getCtx().actionOf?.(target) ?? null
  );
  const frames = getCtx().mode === "always" ? createFrameLayer() : null;
  const wrapperTargets = new Set<HTMLElement>();
  const targetsAtPoint = createTargetsAtPoint(registry.targets);

  const targetBeneath = (element: Element, event: MouseEvent): HTMLElement | null => {
    if (element.closest(INTERACTIVE)) return null;
    const target = targetsAtPoint.innermostAt(pointOf(event));
    return target && isPassedThrough(element, target) ? target : null;
  };

  const targetUnder = (event: MouseEvent): HTMLElement | null => {
    const element = elementOf(event);
    if (!element) return null;
    return findTargetAncestor(element) ?? targetBeneath(element, event);
  };

  const hoverTargetBeneath = (event: MouseEvent) => {
    const element = elementOf(event);
    if (!element || findTargetAncestor(element)) return;
    hover.point(
      element.closest(INTERACTIVE)
        ? targetsAtPoint.innermostAt(pointOf(event))
        : targetBeneath(element, event)
    );
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
      if (target instanceof HTMLElement) registerTarget(target, marker);
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
    if (!isPlainPrimaryClick(event)) return;
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
