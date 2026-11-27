import type { ActionOf, EditBadge } from "./editBadge.js";
import type { TargetRegistry } from "./targetRegistry.js";
import type { IsShown } from "./targetSelector.js";
import type { Point } from "./targetsAtPoint.js";

import { areaOf } from "./targetArea.js";
import { findTargetAncestor } from "./targetSelector.js";

export interface HoverController {
  attach(target: HTMLElement): void;
  detach(target: HTMLElement): void;
  refresh(target: HTMLElement): void;
  point(target: HTMLElement | null, at: Point): void;
  pointAtLayer(element: Element): void;
  dispose(): void;
}

const CLEAR_GRACE_MS = 250;

const cornersOf = ({ bottom, left, right, top }: DOMRect): Point[] => [
  { x: left, y: top },
  { x: right, y: top },
  { x: right, y: bottom },
  { x: left, y: bottom },
];

const turn = (from: Point, to: Point, at: Point): number =>
  (to.x - from.x) * (at.y - from.y) - (to.y - from.y) * (at.x - from.x);

const isInTriangle = (at: Point, a: Point, b: Point, c: Point): boolean => {
  const turns = [turn(a, b, at), turn(b, c, at), turn(c, a, at)];
  return turns.every((side) => side >= 0) || turns.every((side) => side <= 0);
};

const isOnTheWay = (from: Point, rect: DOMRect, at: Point): boolean => {
  const corners = cornersOf(rect);
  return corners.some((corner, index) =>
    isInTriangle(at, from, corner, corners[(index + 1) % corners.length] as Point)
  );
};

const isSamePoint = (one: Point, other: Point): boolean => one.x === other.x && one.y === other.y;

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
  let pendingSwitch: ReturnType<typeof setTimeout> | null = null;
  let nextAfterGrace: HTMLElement | null = null;
  let lastPointOnTarget: Point | null = null;
  let lastPoint: Point | null = null;
  const targetListeners = new Map<
    HTMLElement,
    { area: HTMLElement; enter: () => void; leave: (event: MouseEvent) => void }
  >();

  const cancelPendingSwitch = (): void => {
    if (pendingSwitch === null) return;
    clearTimeout(pendingSwitch);
    pendingSwitch = null;
  };

  const setActive = (next: HTMLElement | null) => {
    cancelPendingSwitch();
    if (next === activeTarget) return;
    lastPointOnTarget = null;
    if (activeTarget) badge.hide();
    if (next) {
      const config = registry.get(next);
      if (config) badge.show(next, config, actionOf(next));
    }
    activeTarget = next;
  };

  const switchAfterGrace = (next: HTMLElement | null): void => {
    nextAfterGrace = next;
    if (pendingSwitch !== null) return;
    pendingSwitch = setTimeout(() => {
      pendingSwitch = null;
      setActive(nextAfterGrace);
    }, CLEAR_GRACE_MS);
  };

  const scheduleClear = (): void => switchAfterGrace(null);

  const shownBadgeRects = (): DOMRect[] =>
    badgeElements
      .map((part) => part.getBoundingClientRect())
      .filter(({ height, width }) => width > 0 && height > 0);

  const isOnTheWayToBadge = (at: Point | null): boolean => {
    const from = lastPointOnTarget;
    if (!from || !at || isSamePoint(from, at)) return false;
    return shownBadgeRects().some((rect) => isOnTheWay(from, rect, at));
  };

  const request = (next: HTMLElement | null, at: Point | null): void => {
    if (next === activeTarget) {
      setActive(next);
      return;
    }
    if (activeTarget && isOnTheWayToBadge(at)) {
      cancelPendingSwitch();
      switchAfterGrace(next);
      return;
    }
    if (next) setActive(next);
    else if (activeTarget) scheduleClear();
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
  const onBadgeEnter = () => cancelPendingSwitch();
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
        if (isShown(target)) request(target, lastPoint);
      };
      const leave = (event: MouseEvent) => {
        if (activeTarget !== target) return;
        const related = event.relatedTarget as Element | null;
        if (related && isOfBadge(related)) return;
        request(related ? findTargetAncestor(related, isShown) : null, lastPoint);
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
        cancelPendingSwitch();
        badge.hide();
        activeTarget = null;
      }
    },
    point(target, at) {
      lastPoint = at;
      request(target, at);
      if (target && target === activeTarget) lastPointOnTarget = at;
    },
    pointAtLayer(element) {
      if (isOfBadge(element)) cancelPendingSwitch();
    },
    refresh(target) {
      if (activeTarget !== target) return;
      const config = registry.get(target);
      if (config) badge.show(target, config, actionOf(target));
    },
    dispose() {
      cancelPendingSwitch();
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
