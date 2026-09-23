"use client";

/**
 * The behaviour every card rail on the site shares: measuring whether it overflows and which end it
 * is against, stepping it by exactly one card, and letting a pointer drag it.
 *
 * It is a hook rather than a component because the two rails that use it put their arrows in
 * different places - CourseRail's sit in the header row beside "View all courses", the store rail's
 * sit under the cards - and a component that owned the arrows would have to own that layout too.
 * The hook owns the scrolling; each block owns where its controls go.
 *
 * The track width belongs to the rail, not to the card. `gridAutoColumns` below is why: a
 * `grid-auto-flow: column` track is exactly the width it is told to be, whatever the card inside it
 * contains. The previous shape put a `clamp(..., calc((100% - gap) / 3.28), ...)` on the card
 * itself, which only resolved correctly when the card was a direct child of the flex rail - wrapped
 * in an `<li>`, `100%` resolved against a shrink-to-fit parent and every card took its own text's
 * width instead, so a three-column grid rendered as one 1200px column per row.
 */

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Track widths are `calc()` fractions of the rail, so `scrollLeft` rarely lands on a whole pixel and
 * an exact `=== 0` / `=== maxScrollLeft` comparison would leave an arrow enabled at either end.
 */
const SCROLL_EDGE_TOLERANCE_PX = 4;

/**
 * Far enough that a click on a card is never mistaken for a drag, short enough that a deliberate
 * drag is not mistaken for a click. Below this the pointer sequence is left alone entirely and the
 * card's own link fires.
 */
const DRAG_THRESHOLD_PX = 5;

/** No overflow until measured, which is what keeps the arrows out of the server-rendered HTML. */
const UNMEASURED_RAIL: CardRailState = { atEnd: true, atStart: true, hasOverflow: false };

export interface CardRailState {
  atEnd: boolean;
  atStart: boolean;
  hasOverflow: boolean;
}

interface UseCardRailOptions {
  /**
   * How many cards the rail currently holds. A topic filter changes this without changing the
   * rail element's own box, so the ResizeObserver below never fires and the arrows would keep the
   * enabled/disabled state of the previous, longer list.
   */
  itemCount: number;
  /** A CSS length for `grid-auto-columns`. Percentages resolve against the rail's own width. */
  itemWidth: string;
}

interface UseCardRailResult<T extends HTMLElement> {
  railRef: React.RefObject<T | null>;
  state: CardRailState;
  scrollByCard: (direction: -1 | 1) => void;
  /** Spread onto the scroll container. Carries the grid tracks and the drag handlers. */
  railProps: {
    onPointerDown: (event: ReactPointerEvent<T>) => void;
    style: CSSProperties;
  };
}

function swallowClick(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function measureCardStep(rail: HTMLElement): number {
  const firstCard = rail.firstElementChild;
  const cardWidth = firstCard instanceof HTMLElement ? firstCard.getBoundingClientRect().width : 0;
  const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
  return cardWidth ? cardWidth + gap : rail.clientWidth * 0.8;
}

export function useCardRail<T extends HTMLElement>({
  itemCount,
  itemWidth,
}: UseCardRailOptions): UseCardRailResult<T> {
  const railRef = useRef<T>(null);
  const [state, setState] = useState<CardRailState>(UNMEASURED_RAIL);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setState({
        atEnd: rail.scrollLeft >= maxScrollLeft - SCROLL_EDGE_TOLERANCE_PX,
        atStart: rail.scrollLeft <= SCROLL_EDGE_TOLERANCE_PX,
        hasOverflow: maxScrollLeft > SCROLL_EDGE_TOLERANCE_PX,
      });
    };

    measure();
    rail.addEventListener("scroll", measure, { passive: true });
    // A width change re-flows the tracks, which changes how many fit and whether the rail overflows
    // at all - so a resize has to re-measure, not merely re-enable the arrows.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, [itemCount]);

  // The rail's own CSS already carries `scroll-smooth` and `snap-proximity` (CARD_RAIL_CLASS), so
  // the browser's native smooth scroll lands on the nearest snap point on its own - no manual
  // requestAnimationFrame tween or easing curve to keep in step with it.
  const scrollByCard = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    const target = Math.max(
      0,
      Math.min(maxScrollLeft, rail.scrollLeft + direction * measureCardStep(rail))
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ behavior: reducedMotion ? "instant" : "smooth", left: target });
  }, []);

  /**
   * Mouse only. A touch pointer already pans a scroll container natively, and capturing it here
   * would replace momentum scrolling with a worse hand-written version; a pen is left alone for the
   * same reason.
   */
  const onPointerDown = useCallback((event: ReactPointerEvent<T>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const rail = event.currentTarget;
    const startX = event.clientX;
    const startScrollLeft = rail.scrollLeft;
    let hasDragged = false;

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (!hasDragged && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
      if (!hasDragged) {
        hasDragged = true;
        // Snap would pull each written frame back toward a snap point mid-drag, so the rail would
        // stutter under the cursor. It is restored on release, which then snaps once.
        rail.style.scrollSnapType = "none";
        rail.style.cursor = "grabbing";
        // Otherwise the browser's own text selection takes over as soon as the pointer moves.
        rail.style.userSelect = "none";
      }
      rail.scrollLeft = startScrollLeft - deltaX;
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (!hasDragged) return;

      rail.style.scrollSnapType = "";
      rail.style.cursor = "";
      rail.style.userSelect = "";

      // A drag that ends over a card would otherwise fire that card's link. Registered in the
      // capture phase so it runs before the link's own handler, and torn down on the next tick
      // whether or not a click followed.
      rail.addEventListener("click", swallowClick, { capture: true, once: true });
      setTimeout(() => rail.removeEventListener("click", swallowClick, { capture: true }), 0);
    };

    // On `window`, not on the rail: a fast drag leaves the rail's box within the first few pixels,
    // and listeners bound to the rail would then never see the pointerup that tears them down.
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }, []);

  return {
    railProps: {
      onPointerDown,
      style: { gridAutoColumns: itemWidth },
    },
    railRef,
    scrollByCard,
    state,
  };
}
