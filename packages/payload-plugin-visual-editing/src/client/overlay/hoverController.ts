import type { EditBadge } from "./editBadge.js";
import type { TargetRegistry } from "./targetRegistry.js";

import { findTargetAncestor } from "./targetSelector.js";

export interface HoverController {
  attach(target: HTMLElement): void;
  detach(target: HTMLElement): void;
  refresh(target: HTMLElement): void;
  dispose(): void;
}

const HOVER_FLAG_ATTR = "data-ve-hovering";
const setHoverFlag = (on: boolean): void => {
  const body = typeof document === "undefined" ? null : document.body;
  if (!body) return;
  if (on) body.setAttribute(HOVER_FLAG_ATTR, "true");
  else body.removeAttribute(HOVER_FLAG_ATTR);
};

const CLEAR_GRACE_MS = 250;

export function createHoverController(badge: EditBadge, registry: TargetRegistry): HoverController {
  const label = badge.labelElement;
  let activeTarget: HTMLElement | null = null;
  let pendingClear: ReturnType<typeof setTimeout> | null = null;
  const targetListeners = new Map<
    HTMLElement,
    { enter: () => void; leave: (event: MouseEvent) => void }
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
      if (config) badge.show(next, config);
    }
    activeTarget = next;
    setHoverFlag(next !== null);
  };

  const scheduleClear = (): void => {
    if (pendingClear !== null) return;
    pendingClear = setTimeout(() => {
      pendingClear = null;
      setActive(null);
    }, CLEAR_GRACE_MS);
  };

  const onLabelLeave = (event: MouseEvent) => {
    if (!activeTarget) return;
    const related = event.relatedTarget as Element | null;
    if (related && (related === activeTarget || activeTarget.contains(related))) return;
    const nextTarget = related ? findTargetAncestor(related) : null;
    if (nextTarget) setActive(nextTarget);
    else scheduleClear();
  };
  label.addEventListener("mouseleave", onLabelLeave);
  const onLabelEnter = () => cancelPendingClear();
  label.addEventListener("mouseenter", onLabelEnter);

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

  return {
    attach(target) {
      if (targetListeners.has(target)) return;
      const enter = () => setActive(target);
      const leave = (event: MouseEvent) => {
        if (activeTarget !== target) return;
        const related = event.relatedTarget as Element | null;
        if (related === label) return;
        const nextTarget = related ? findTargetAncestor(related) : null;
        if (nextTarget) setActive(nextTarget);
        else scheduleClear();
      };
      target.addEventListener("mouseenter", enter);
      target.addEventListener("mouseleave", leave);
      targetListeners.set(target, { enter, leave });
    },
    detach(target) {
      const listeners = targetListeners.get(target);
      if (!listeners) return;
      target.removeEventListener("mouseenter", listeners.enter);
      target.removeEventListener("mouseleave", listeners.leave);
      targetListeners.delete(target);
      if (activeTarget === target) {
        cancelPendingClear();
        badge.hide();
        activeTarget = null;
        setHoverFlag(false);
      }
    },
    refresh(target) {
      if (activeTarget !== target) return;
      const config = registry.get(target);
      if (config) badge.show(target, config);
    },
    dispose() {
      cancelPendingClear();
      window.removeEventListener("scroll", repositionIfActive, true);
      window.removeEventListener("resize", repositionIfActive);
      label.removeEventListener("mouseleave", onLabelLeave);
      label.removeEventListener("mouseenter", onLabelEnter);
      for (const [target, listeners] of targetListeners) {
        target.removeEventListener("mouseenter", listeners.enter);
        target.removeEventListener("mouseleave", listeners.leave);
      }
      targetListeners.clear();
      if (activeTarget) {
        badge.hide();
        activeTarget = null;
      }
      setHoverFlag(false);
    },
  };
}
