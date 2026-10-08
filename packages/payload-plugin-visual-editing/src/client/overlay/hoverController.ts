import type { EditBadge } from "./editBadge.js";
import type { TargetRegistry } from "./targetRegistry.js";

import { findTargetAncestor } from "./targetSelector.js";

export interface HoverController {
  /** Bind mouseenter/mouseleave listeners to `target`. Target must already be in the registry. */
  attach(target: HTMLElement): void;
  /** Remove listeners from `target`; hides the badge if `target` was the active one. */
  detach(target: HTMLElement): void;
  /** If `target` is currently active, re-show the badge with its latest registry config.
   *  Called after a same-element marker change so the visible Edit link points at the new path. */
  refresh(target: HTMLElement): void;
  /** Remove all global listeners (scroll/resize/label) and any remaining per-target listeners. */
  dispose(): void;
}

const HOVER_FLAG_ATTR = "data-ve-hovering";
const setHoverFlag = (on: boolean): void => {
  const body = typeof document === "undefined" ? null : document.body;
  if (!body) return;
  if (on) body.setAttribute(HOVER_FLAG_ATTR, "true");
  else body.removeAttribute(HOVER_FLAG_ATTR);
};

// Grace period on clearing `activeTarget`
const CLEAR_GRACE_MS = 250;

// Only the innermost target under the cursor shows an overlay. Nested targets would otherwise
// all stay "hovered" simultaneously (mouseleave doesn't fire on an ancestor when the mouse
// enters a descendant), which stacks outlines and overlaps Edit badges. We track a single
// `activeTarget` and swap it on each mouseenter/mouseleave transition.
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

  // The Edit badge lives outside the target in the DOM, so moving the mouse from the target
  // up onto the badge fires a mouseleave on the target. We intercept that specific transition
  // (relatedTarget === label) to keep the overlay open, and rely on the label's own
  // mouseleave to decide what to do next when the user leaves the badge.
  const onLabelLeave = (event: MouseEvent) => {
    if (!activeTarget) return;
    const related = event.relatedTarget as Element | null;
    if (related && (related === activeTarget || activeTarget.contains(related))) return;
    const nextTarget = related ? findTargetAncestor(related) : null;
    if (nextTarget) setActive(nextTarget);
    else scheduleClear();
  };
  label.addEventListener("mouseleave", onLabelLeave);
  // Cursor reaching the label via the dead-zone between target.top and the
  // badge resolves the pending clear scheduled from target.mouseleave.
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
        // Mouse crossed into our own Edit badge — keep the overlay open,
        // the label's own mouseleave will take over from here.
        if (related === label) return;
        const nextTarget = related ? findTargetAncestor(related) : null;
        // Committing null immediately is the dead-zone bug (see CLEAR_GRACE_MS):
        // the cursor is often mid-transit to the Edit label and a label.mouseenter
        // is about to cancel this. Schedule instead.
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
