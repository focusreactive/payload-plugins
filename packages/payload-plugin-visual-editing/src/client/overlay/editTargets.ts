import type { FieldMatch, FieldTracker } from "./fieldTracker.js";
import type { Marker } from "./markerExtractor.js";
import type { TargetConfig, TargetRegistryCtx } from "./targetRegistry.js";

import { DATA_VE_PATH_ATTR } from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { LABEL_CLASS } from "./constants.js";
import { createEditBadge } from "./editBadge.js";
import { createHoverController } from "./hoverController.js";
import { groupNodesByPath, readMarkerFromAttrs } from "./markerExtractor.js";
import { createTargetRegistry } from "./targetRegistry.js";
import { findTargetAncestor, pickTargetForGroup } from "./targetSelector.js";

const isPlainPrimaryClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const hasTextSelection = () => document.getSelection()?.isCollapsed === false;

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
  getCtx: () => TargetRegistryCtx
): () => void {
  removeLabelsLeftBySkippedCleanup();

  const registry = createTargetRegistry();
  const badge = createEditBadge();
  const hover = createHoverController(badge, registry);
  const wrapperTargets = new Set<HTMLElement>();

  const registerTarget = (target: HTMLElement, marker: Marker) => {
    const existing = registry.get(target);
    if (existing && addressesSameField(existing, marker)) return;
    registry.upsert(target, marker, getCtx());
    if (existing) {
      hover.refresh(target);
    } else {
      hover.attach(target);
    }
  };

  const releaseTarget = (target: HTMLElement) => {
    hover.detach(target);
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
    const target = findTargetAncestor(event.target instanceof Element ? event.target : null);
    const config = target ? registry.get(target) : undefined;
    if (!config) return;
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

  return () => {
    main.removeEventListener("click", openFieldOnTargetClick, true);
    stopTracking();
    hover.dispose();
    registry.disposeAll();
    badge.dispose();
  };
}
