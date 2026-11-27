import type { ActionOf, EditBadge } from "./editBadge.js";
import type { TargetRegistry } from "./targetRegistry.js";
import type { IsShown } from "./targetSelector.js";
import type { Point } from "./targetsAtPoint.js";

import { areaOf } from "./targetArea.js";
import { findTargetAncestor } from "./targetSelector.js";
import { pointOf } from "./targetsAtPoint.js";

export interface HoverController {
  attach(target: HTMLElement): void;
  detach(target: HTMLElement): void;
  refresh(target: HTMLElement): void;
  point(target: HTMLElement | null, at: Point): void;
  pointAtLayer(element: Element): void;
  dispose(): void;
}

const CLEAR_GRACE_MS = 250;

const WAY_MARGIN_MIN_PX = 24;

const WAY_MARGIN_PER_DISTANCE = 0.06;

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

const distanceBetween = (one: Point, other: Point): number =>
  Math.hypot(one.x - other.x, one.y - other.y);

const centerOf = ({ height, left, top, width }: DOMRect): Point => ({
  x: left + width / 2,
  y: top + height / 2,
});

const distanceToSegment = (at: Point, start: Point, end: Point): number => {
  const run = { x: end.x - start.x, y: end.y - start.y };
  const squaredLength = run.x ** 2 + run.y ** 2;
  const projected =
    squaredLength === 0 ? 0 : ((at.x - start.x) * run.x + (at.y - start.y) * run.y) / squaredLength;
  const along = Math.min(1, Math.max(0, projected));
  return distanceBetween(at, { x: start.x + along * run.x, y: start.y + along * run.y });
};

const isOnTheWay = (from: Point, rect: DOMRect, at: Point): boolean => {
  const center = centerOf(rect);
  const distance = distanceBetween(from, center);
  if (distanceBetween(at, center) >= distance) return false;
  const margin = Math.max(WAY_MARGIN_MIN_PX, distance * WAY_MARGIN_PER_DISTANCE);
  const corners = cornersOf(rect);
  return corners.some(
    (corner, index) =>
      isInTriangle(at, from, corner, corners[(index + 1) % corners.length] as Point) ||
      distanceToSegment(at, from, corner) <= margin
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
  const targetListeners = new Map<
    HTMLElement,
    { area: HTMLElement; enter: (event: MouseEvent) => void; leave: (event: MouseEvent) => void }
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
      const enter = (event: MouseEvent) => {
        if (isShown(target)) request(target, pointOf(event));
      };
      const leave = (event: MouseEvent) => {
        if (activeTarget !== target) return;
        const related = event.relatedTarget as Element | null;
        if (related && isOfBadge(related)) return;
        request(related ? findTargetAncestor(related, isShown) : null, pointOf(event));
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
