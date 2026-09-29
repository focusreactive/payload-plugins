import { Media } from "@/components/media";
import type { PreparedMedia } from "@/components/media";
import { cn } from "@/components/utils";
import { checkoutVariant } from "@/lib/actions/checkoutVariant";

export interface ProductCardProps {
  cover?: PreparedMedia;
  title: string;
  price?: string;
  priceBefore?: string;
  /** Null/undefined renders the card as a plain, unclickable article - out of stock or no variant. */
  variantId?: string | null;
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
 *
 * The whole card submits `checkoutVariant` rather than linking to the Shopify product page - a
 * click here is meant to buy, not to browse, so there is no intermediate storefront page to land
 * the shopper on first.
 */
export function ProductCard({
  className,
  cover,
  price,
  priceBefore,
  title,
  variantId,
}: ProductCardProps) {
  const cardClassName = cn(
    "group relative flex grow flex-col overflow-hidden rounded-xl border border-ink-08 bg-card text-left text-foreground",
    "transition-colors duration-200 ease-out",
    variantId && "hover:border-primary",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "motion-reduce:transition-none",
    className
  );

  const content = (
    <>
      {/*
        A mount, not a crop window: the dev store's own product photos are 262x262 squares, and
        `object-cover` bleeding one into a 3/4 box meant cropping a square into a portrait AND
        upscaling it ~1.7x to fill the width - the two things that make a small source image read
        as "low quality" rather than just small. `object-contain` inside a padded well shows the
        square photo whole and only as large as it actually is; the padding is what turns the
        leftover space into a deliberate frame instead of looking like a missing image. 4/5 is
        gentler than the 3/4 this replaced - that one still read "too tall" once the image itself
        stopped needing the extra height to avoid a crop.
      */}
      <div className="relative w-full flex-none overflow-hidden bg-primary-soft aspect-[4/5] p-[clamp(16px,3vw,32px)]">
        {cover && (
          <Media
            {...cover.data}
            imageProps={{
              ...cover.imageProps,
              className: "size-full object-contain",
              fill: true,
              fit: "contain",
              sizes: "(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 380px",
            }}
            visualEditing={cover.visualEditing}
          />
        )}
      </div>

      <div className="flex grow flex-col p-[clamp(10px,1vw,14px)]">
        <h3
          className={cn(
            "m-0 mb-[clamp(8px,0.9vw,12px)] text-h-card text-pretty text-foreground transition-colors duration-200 ease-out line-clamp-2",
            variantId && "group-hover:text-primary"
          )}
        >
          {title}
        </h3>

        {price && (
          <div className="mt-auto flex flex-wrap items-baseline gap-2.5">
            <span className="text-lead font-medium text-primary">{price}</span>
            {priceBefore && (
              <span className="text-small text-ink-42 line-through">{priceBefore}</span>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (!variantId) {
    return <article className={cardClassName}>{content}</article>;
  }

  return (
    <form action={checkoutVariant} className="contents">
      <input name="variantId" type="hidden" value={variantId} />
      <button className={cardClassName} type="submit">
        {content}
      </button>
    </form>
  );
}
