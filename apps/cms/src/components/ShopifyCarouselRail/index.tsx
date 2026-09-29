"use client";

/**
 * The slider of the Shopify Carousel block, plus the prev/next controls that page it.
 *
 * Why a client component at all: nothing in HTML moves a scroll container, so paging the rail needs
 * JavaScript. Everything else about the section stays on the server - the cards themselves arrive as
 * `children`, rendered by the block's server component, so the product titles, prices and covers are
 * still in the delivered HTML. Verify that the way the block's Component.tsx says to:
 * `curl -s <url> | grep -i "<a product title>"`.
 *
 * Why it wraps the rail instead of locating it by id the way AudioSeekButton does: two of these
 * blocks on one page would share the id, and the second pair of arrows would silently drive the
 * first rail. A ref cannot collide.
 *
 * The controls render nothing at all until `useCardRail` has measured the rail. That is the degraded
 * path: with JavaScript unavailable no arrows appear, and the rail is still a plain `overflow-x`
 * scroll container, so no card is unreachable. Do not move the buttons into the server-rendered
 * markup - they would render as controls that cannot work.
 */

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";

import { CARD_RAIL_CLASS, CARD_RAIL_ITEM_WIDTH } from "@/components/ui/CardRail/constants";
import { useCardRail } from "@/components/ui/CardRail/useCardRail";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/utils";

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
    <IconButton
      aria-controls={railElementId}
      aria-label={isPrevious ? "Show the previous products" : "Show the next products"}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden size={18} />
    </IconButton>
  );
}

interface ShopifyCarouselRailProps {
  /** The product cards, as `<li>` elements rendered by the block's server component. */
  children: ReactNode;
  /** Names the rail for a screen reader. The section heading. */
  label: string;
  /** How many cards `children` holds, so the hook re-measures when the product list changes. */
  itemCount: number;
}

export function ShopifyCarouselRail({ children, itemCount, label }: ShopifyCarouselRailProps) {
  const railElementId = useId();
  const { railProps, railRef, scrollByCard, state } = useCardRail<HTMLUListElement>({
    itemCount,
    itemWidth: CARD_RAIL_ITEM_WIDTH,
  });

  return (
    <div className="flex flex-col gap-8">
      {/*
        tabIndex makes the rail reachable by keyboard: a scroll container that only answers to a
        trackpad is unusable without one, and the arrows are absent until this component hydrates.
      */}
      <ul
        aria-label={label}
        className={cn(CARD_RAIL_CLASS, "list-none pb-3")}
        id={railElementId}
        ref={railRef}
        tabIndex={0}
        {...railProps}
      >
        {children}
      </ul>

      {state.hasOverflow ? (
        <div className="flex justify-end gap-2.5">
          <RailButton
            direction="prev"
            disabled={state.atStart}
            onClick={() => scrollByCard(-1)}
            railElementId={railElementId}
          />
          <RailButton
            direction="next"
            disabled={state.atEnd}
            onClick={() => scrollByCard(1)}
            railElementId={railElementId}
          />
        </div>
      ) : null}
    </div>
  );
}
