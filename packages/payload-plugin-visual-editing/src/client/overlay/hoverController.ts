import type { ActionOf, EditBadge } from "./editBadge.js";
import type { TargetRegistry } from "./targetRegistry.js";
import type { IsShown } from "./targetSelector.js";

import { areaOf } from "./targetArea.js";
import { findTargetAncestor } from "./targetSelector.js";

export interface HoverController {
  attach(target: HTMLElement): void;
  detach(target: HTMLElement): void;
  refresh(target: HTMLElement): void;
  point(target: HTMLElement | null): void;
  dispose(): void;
}

const CLEAR_GRACE_MS = 250;

export function createHoverController(
  badge: EditBadge,
  registry: TargetRegistry,
  actionOf: ActionOf,
  isShown: IsShown
): HoverController {
  const badgeElements: HTMLElement[] = [badge.labelElement, badge.actionElement];
  const isOfBadge = (element: Element): boolean =>
    badgeElements.some((part) => part === element || part.contains(element));
  let activeTarget: HTMLElement | null = null;
  let pendingClear: ReturnType<typeof setTimeout> | null = null;
  const targetListeners = new Map<
    HTMLElement,
    { area: HTMLElement; enter: () => void; leave: (event: MouseEvent) => void }
  >();

  const cancelPendingClear = (): void => {
    if (pendingClear === null) return;
    clearTimeout(pendingClear);
    pendingClear = null;
  };

  const setActive = (next: HTMLElement | null) => {
    cancelPendingClear();
    if (next === activeTarget) return;
    if (activeTarget) badge.hide();
    if (next) {
      const config = registry.get(next);
      if (config) badge.show(next, config, actionOf(next));
    }
    activeTarget = next;
  };

  const scheduleClear = (): void => {
    if (pendingClear !== null) return;
    pendingClear = setTimeout(() => {
      pendingClear = null;
      setActive(null);
    }, CLEAR_GRACE_MS);
  };

  const onBadgeLeave = (event: MouseEvent) => {
    if (!activeTarget) return;
    const related = event.relatedTarget as Element | null;
    if (related && areaOf(activeTarget).contains(related)) return;
    if (related && isOfBadge(related)) return;
    const nextTarget = related ? findTargetAncestor(related, isShown) : null;
    if (nextTarget) setActive(nextTarget);
    else scheduleClear();
  };
  const onBadgeEnter = () => cancelPendingClear();
  for (const part of badgeElements) {
    part.addEventListener("mouseleave", onBadgeLeave);
    part.addEventListener("mouseenter", onBadgeEnter);
  }

  const repositionIfActive = () => {
    if (!activeTarget) return;
    if (!activeTarget.isConnected) {
      setActive(null);
      return;
    }
    badge.reposition(activeTarget);
  };
  window.addEventListener("scroll", repositionIfActive, { capture: true, passive: true });
  window.addEventListener("resize", repositionIfActive, { passive: true });
  window.addEventListener("input", repositionIfActive, { capture: true, passive: true });

  return {
    attach(target) {
      if (targetListeners.has(target)) return;
      const enter = () => {
        if (isShown(target)) setActive(target);
      };
      const leave = (event: MouseEvent) => {
        if (activeTarget !== target) return;
        const related = event.relatedTarget as Element | null;
        if (related && isOfBadge(related)) return;
        const nextTarget = related ? findTargetAncestor(related, isShown) : null;
        if (nextTarget) setActive(nextTarget);
        else scheduleClear();
      };
      const area = areaOf(target);
      area.addEventListener("mouseenter", enter);
      area.addEventListener("mouseleave", leave);
      targetListeners.set(target, { area, enter, leave });
    },
    detach(target) {
      const listeners = targetListeners.get(target);
      if (!listeners) return;
      listeners.area.removeEventListener("mouseenter", listeners.enter);
      listeners.area.removeEventListener("mouseleave", listeners.leave);
      targetListeners.delete(target);
      if (activeTarget === target) {
        cancelPendingClear();
        badge.hide();
        activeTarget = null;
      }
    },
    point(target) {
      if (target) setActive(target);
      else if (activeTarget) scheduleClear();
    },
    refresh(target) {
      if (activeTarget !== target) return;
      const config = registry.get(target);
      if (config) badge.show(target, config, actionOf(target));
    },
    dispose() {
      cancelPendingClear();
      window.removeEventListener("scroll", repositionIfActive, true);
      window.removeEventListener("resize", repositionIfActive);
      window.removeEventListener("input", repositionIfActive, true);
      for (const part of badgeElements) {
        part.removeEventListener("mouseleave", onBadgeLeave);
        part.removeEventListener("mouseenter", onBadgeEnter);
      }
      for (const listeners of targetListeners.values()) {
        listeners.area.removeEventListener("mouseenter", listeners.enter);
        listeners.area.removeEventListener("mouseleave", listeners.leave);
      }
      targetListeners.clear();
      if (activeTarget) {
        badge.hide();
        activeTarget = null;
      }
    },
  };
}
