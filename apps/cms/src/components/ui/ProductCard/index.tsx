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
        No padding, no radius here: the card's own `overflow-hidden` + `rounded-xl` clips this box
        to the card's shape for free, so the cover bleeds flush to the top/left/right edges instead
        of floating in a well. 3/4 reads as a book cover without the height a true 2/3 trade-
        paperback ratio would give it at the rail's own card width (~600px tall at 400px wide,
        which dwarfed the row) - the 485/300 landscape box this replaced was built for talk/course
        thumbnails and cropped a portrait cover hard in the other direction.
      */}
      <div className="relative w-full flex-none overflow-hidden bg-primary-soft aspect-[3/4]">
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
