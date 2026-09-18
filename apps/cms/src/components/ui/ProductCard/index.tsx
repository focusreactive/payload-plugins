import Link from "next/link";

import { Media } from "@/components/media";
import type { PreparedMedia } from "@/components/media";
import { cn } from "@/components/utils";

export interface ProductCardProps {
  cover?: PreparedMedia;
  title: string;
  price?: string;
  priceBefore?: string;
  href: string;
  className?: string;
}

/**
 * The Shopify carousel's own card, split out of `ContentCard` rather than bent to fit it:
 * `ContentCard` also feeds TalkGrid, CourseRail and the search results grid, so a store-only change
 * there (no rating cluster, no description, a hover that never moves) would have meant threading a
 * new variant through four call sites for one block's opinion.
 *
 * `grow` is what makes every card in a rail row the same height: the rail (`CARD_RAIL_CLASS`) sets
 * `items-stretch`, which gives each `<li>` the row's tallest natural height, and `grow` is what lets
 * this card claim that height rather than sitting at its own shorter content height inside the
 * `<li>`'s flex column. `mt-auto` on the price row then pins it to the bottom of whatever height
 * that turns out to be, so a two-line title and a one-line title end at the same price baseline.
 */
export function ProductCard({
  className,
  cover,
  href,
  price,
  priceBefore,
  title,
}: ProductCardProps) {
  return (
    <Link
      className={cn(
        "group relative flex grow flex-col overflow-hidden rounded-xl border border-ink-08 bg-card p-[clamp(10px,1vw,14px)] text-foreground",
        "transition-colors duration-200 ease-out hover:border-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "motion-reduce:transition-none",
        className
      )}
      href={href}
    >
      <div className="relative w-full flex-none overflow-hidden rounded-inner bg-primary-soft aspect-[485/300]">
        {cover && (
          <Media
            {...cover.data}
            imageProps={{
              ...cover.imageProps,
              className: "size-full object-cover",
              fill: true,
              fit: "cover",
              sizes: "(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 380px",
            }}
            visualEditing={cover.visualEditing}
          />
        )}
      </div>

      <h3 className="m-0 mt-[clamp(10px,1vw,14px)] mb-[clamp(8px,0.9vw,12px)] px-1 text-h-card text-pretty text-foreground line-clamp-2 transition-colors duration-200 ease-out group-hover:text-primary">
        {title}
      </h3>

      {price && (
        <div className="mt-auto flex flex-wrap items-baseline gap-2.5 px-1 pb-1">
          <span className="text-lead font-medium text-primary">{price}</span>
          {priceBefore && (
            <span className="text-small text-ink-42 line-through">{priceBefore}</span>
          )}
        </div>
      )}
    </Link>
  );
}
