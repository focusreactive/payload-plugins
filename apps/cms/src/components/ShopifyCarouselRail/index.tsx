"use client";

/**
 * The scrollable rail of the Shopify Carousel block, plus the prev/next controls that page it.
 *
 * Why a client component at all: nothing in HTML moves a scroll container, so paging the rail needs
 * `scrollBy`, which needs JavaScript. Everything else about the section stays on the server - the
 * cards themselves arrive as `children`, rendered by the block's server component, so the product
 * titles, prices and covers are still in the delivered HTML. Verify that the way the block's
 * Component.tsx says to: `curl -s <url> | grep -i "<a product title>"`.
 *
 * Why it wraps the rail instead of locating it by id the way AudioSeekButton does: two of these
 * blocks on one page would share the id, and the second pair of arrows would silently drive the
 * first rail. A ref cannot collide.
 *
 * The controls render nothing at all until the effect below has measured the rail. That is the
 * degraded path: with JavaScript unavailable no arrows appear, and the rail is still a plain
 * `overflow-x` scroll container, so no card is unreachable. Do not move the buttons into the
 * server-rendered markup - they would render as controls that cannot work.
 */

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button, ButtonVariant } from "@/components/button";

/**
 * Card widths are `calc()` fractions of the container, so `scrollLeft` rarely lands on a whole
 * pixel and an exact `=== 0` / `=== maxScrollLeft` comparison would leave an arrow enabled at the
 * end of the rail.
 */
const SCROLL_EDGE_TOLERANCE_PX = 4;

/**
 * Cards render at `ContentCard`'s own course-variant width, a fluid `clamp()` with no fixed
 * breakpoints - there is no single number for "one card" to hardcode here the way the old
 * per-breakpoint rail could. Measuring the first rendered `<li>` (and the rail's own gap, the same
 * way) gets the true on-screen card width at whatever viewport this runs at, instead of drifting
 * out of sync with it.
 */
function measureCardStep(rail: HTMLElement): number {
  const firstCard = rail.firstElementChild;
  const cardWidth = firstCard instanceof HTMLElement ? firstCard.getBoundingClientRect().width : 0;
  const gap = Number.parseFloat(getComputedStyle(rail).columnGap || "0") || 0;
  return cardWidth + gap;
}

interface RailState {
  atEnd: boolean;
  atStart: boolean;
  hasOverflow: boolean;
}

/** No overflow until measured, which is what keeps the controls out of the server-rendered HTML. */
const UNMEASURED_RAIL: RailState = { atEnd: true, atStart: true, hasOverflow: false };

interface RailButtonProps {
  direction: "next" | "prev";
  disabled: boolean;
  onClick: () => void;
  railElementId: string;
}

function RailButton({ direction, disabled, onClick, railElementId }: RailButtonProps) {
  const isPrevious = direction === "prev";
  const Icon = isPrevious ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <Button
      aria-controls={railElementId}
      aria-label={isPrevious ? "Show the previous products" : "Show the next products"}
      // The ghost variant already carries `disabled:opacity-50 disabled:pointer-events-none`, so an
      // arrow at either end of the rail reads as unavailable instead of being a click that does
      // nothing. `p-0` overrides the variant's own padding - twMerge drops the px/py it replaces.
      className="size-11 shrink-0 p-0"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant={ButtonVariant.Ghost}
    >
      <Icon aria-hidden size={20} />
    </Button>
  );
}

interface ShopifyCarouselRailProps {
  /** The product cards, as `<li>` elements rendered by the block's server component. */
  children: ReactNode;
  /** Names the rail for a screen reader. The section heading. */
  label: string;
}

export function ShopifyCarouselRail({ children, label }: ShopifyCarouselRailProps) {
  const railRef = useRef<HTMLUListElement>(null);
  const railElementId = useId();
  const [railState, setRailState] = useState<RailState>(UNMEASURED_RAIL);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setRailState({
        atEnd: rail.scrollLeft >= maxScrollLeft - SCROLL_EDGE_TOLERANCE_PX,
        atStart: rail.scrollLeft <= SCROLL_EDGE_TOLERANCE_PX,
        hasOverflow: maxScrollLeft > SCROLL_EDGE_TOLERANCE_PX,
      });
    };

    measure();
    rail.addEventListener("scroll", measure, { passive: true });
    // A width change re-flows the cards, which changes how many fit and whether the rail overflows
    // at all - so a resize has to re-measure, not merely re-enable the arrows. Watching the rail
    // rather than the window also covers the container itself changing width.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    // One card plus the gap, not a whole rail width: a viewport-width jump skipped whole rows of
    // cards on a wide screen, where several cards fit per press. Passing no `behavior` leaves the
    // choice to the element's CSS `scroll-behavior`, which is smooth only under `motion-safe`.
    rail.scrollBy({ left: direction * measureCardStep(rail) });
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/*
        tabIndex makes the rail reachable by keyboard: a scroll container that only answers to a
        trackpad is unusable without one, and the arrows are absent until this component hydrates.
      */}
      <ul
        aria-label={label}
        // This gap is not a free choice: ContentCard's course-variant width bakes in the same
        // `clamp(16px,1.6vw,24px)` as the gap it divides against (CourseRail's rail uses the
        // identical value for the identical reason), so a different gap here would make the cards
        // overflow their row instead of landing exactly 3.28-to-a-line.
        className="flex list-none snap-x snap-mandatory gap-[clamp(16px,1.6vw,24px)] overflow-x-auto overscroll-x-contain pb-3 motion-safe:scroll-smooth"
        id={railElementId}
        ref={railRef}
        tabIndex={0}
      >
        {children}
      </ul>

      {railState.hasOverflow ? (
        <div className="flex justify-end gap-2.5">
          <RailButton
            direction="prev"
            disabled={railState.atStart}
            onClick={() => scrollByCard(-1)}
            railElementId={railElementId}
          />
          <RailButton
            direction="next"
            disabled={railState.atEnd}
            onClick={() => scrollByCard(1)}
            railElementId={railElementId}
          />
        </div>
      ) : null}
    </div>
  );
}
