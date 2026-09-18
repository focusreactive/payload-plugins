import Link from "next/link";

import { Media } from "@/components/media";
import { cn } from "@/components/utils";

import { RatingGlyph, StarRating } from "../StarRating";
import type { ContentCardProps, ContentCardVariant } from "./types";

/**
 * A course card fills whatever box it is given, because the box is what knows how wide a card
 * should be: a rail track (`useCardRail`'s `gridAutoColumns`) or a grid column. It used to carry
 * `clamp(260px, calc((100% - 2 * gap) / 3.28), 460px)` itself, which is only right when the card is
 * a direct child of the rail - inside the `<li>` that TalkGrid and the store rail wrap it in, that
 * `100%` resolved against a shrink-to-fit parent and each card took its own text's width, so a
 * three-column grid rendered one 1200px card per row.
 *
 * The featured card keeps a width of its own because it has no track: it floats over the hero
 * image, sized against the viewport. It stays an inline style rather than an arbitrary Tailwind
 * value because the spaces CSS requires inside `min()` collide with Tailwind's underscore escape.
 */
const CONTENT_CARD_WIDTH: Record<ContentCardVariant, string> = {
  course: "100%",
  featured: "clamp(200px, min(19vw, 26vh), 300px)",
};

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

interface ContentCardCoverProps {
  cover: ContentCardProps["cover"];
  variant: ContentCardVariant;
}

/**
 * Rendered only when there IS a cover. An always-present well is right on the concept's own feed,
 * where every card is a course with artwork, and wrong on this archive: a talk's cover is optional
 * and a topic has no image at all, so a results grid came out as a row of empty pale boxes.
 */
function ContentCardCover({ cover, variant }: ContentCardCoverProps) {
  const isFeatured = variant === "featured";

  return (
    <div
      className={cn(
        "relative w-full flex-none overflow-hidden rounded-inner bg-primary-soft",
        isFeatured ? "aspect-[300/148]" : "aspect-[485/300]"
      )}
    >
      {cover && (
        <Media
          {...cover.data}
          imageProps={{
            ...cover.imageProps,
            className: cn(
              "size-full object-cover",
              // Replaces the concept's `onMouseEnter`/`onMouseLeave` state (which drove this same
              // zoom): a `group-hover` scale gets the identical effect without an event handler,
              // which is what keeps this a server component.
              isFeatured &&
                "transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.3,1)] group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            ),
            fill: true,
            fit: "cover",
            sizes: isFeatured
              ? "(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 300px"
              : "(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 380px",
          }}
          visualEditing={cover.visualEditing}
        />
      )}
    </div>
  );
}

type ContentCardBodyProps = Omit<ContentCardProps, "className" | "href" | "variant"> & {
  variant: ContentCardVariant;
};

function FeaturedCardBody({
  cover,
  dateLabel,
  eyebrow,
  price,
  priceBefore,
  rating,
  title,
}: ContentCardBodyProps) {
  const hasMetaRow = rating != null || Boolean(dateLabel);

  return (
    <>
      {eyebrow && (
        <div className="flex items-center justify-between gap-2 px-1 pt-0.5 pb-[clamp(8px,0.9vw,12px)]">
          {/* 11px/0.14em in the concept - the two-value exception the corrected brief calls out.
              Reusing `text-eyebrow` (12px/0.1em) over adding a one-off utility for a single label. */}
          <span className="text-eyebrow whitespace-nowrap text-ink-62">{eyebrow}</span>
          <span
            aria-hidden
            className="flex size-[22px] flex-none items-center justify-center rounded-pill bg-primary-soft opacity-0 transition-opacity duration-[250ms] ease-out group-hover:opacity-100 motion-reduce:transition-none"
          >
            <svg className="text-primary" fill="none" height="9" viewBox="0 0 16 10" width="11">
              <path
                d="M1 5h13M10 1l4 4-4 4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
        </div>
      )}

      {cover && <ContentCardCover cover={cover} variant="featured" />}

      {hasMetaRow && (
        <div className="mb-2 flex items-center gap-2 px-1 pt-[clamp(10px,1vw,14px)]">
          {rating != null && <RatingGlyph rating={rating} />}
          {rating != null && dateLabel && (
            <span aria-hidden className="size-[3px] flex-none rounded-pill bg-ink-24" />
          )}
          {dateLabel && (
            <span className="text-eyebrow whitespace-nowrap text-ink-42">{dateLabel}</span>
          )}
        </div>
      )}

      <h3
        className={cn(
          "m-0 px-1 text-[16px] leading-[1.35] font-normal text-pretty text-foreground",
          !hasMetaRow && "pt-[clamp(10px,1vw,14px)]",
          price ? "mb-[clamp(8px,1vw,12px)]" : "mb-1"
        )}
      >
        {title}
      </h3>

      {price && (
        <div className="flex flex-wrap items-baseline gap-2 px-1 pb-1">
          <span className="text-body-lg font-medium text-primary">{price}</span>
          {priceBefore && (
            <span className="text-[13px] text-ink-42 line-through">{priceBefore}</span>
          )}
        </div>
      )}
    </>
  );
}

function CourseCardBody({
  cover,
  dateLabel,
  description,
  eyebrow,
  price,
  priceBefore,
  rating,
  title,
}: ContentCardBodyProps) {
  /*
   * The concept only ever fills this slot with stars, because every card it draws is a rated
   * course. A feed with no ratings - talks, products - leaves it empty and the date sits alone
   * against the right edge, so a short label (the kind of talk, say) takes the space the stars
   * would have had rather than needing a row of its own. A rating still wins it when both exist.
   */
  const leadingMeta =
    rating == null ? (
      eyebrow ? (
        <span className="text-eyebrow whitespace-nowrap text-foreground">{eyebrow}</span>
      ) : null
    ) : (
      <StarRating rating={rating} />
    );

  return (
    <>
      {cover && <ContentCardCover cover={cover} variant="course" />}

      {(leadingMeta || dateLabel) && (
        <div
          className={cn(
            "flex items-center gap-3 px-1 pt-[clamp(12px,1.2vw,18px)] pb-[clamp(8px,0.9vw,12px)]",
            leadingMeta ? "justify-between" : "justify-end"
          )}
        >
          {leadingMeta}
          {dateLabel && (
            <span className="text-eyebrow whitespace-nowrap text-ink-42">{dateLabel}</span>
          )}
        </div>
      )}

      <h3 className="m-0 mb-[clamp(8px,0.9vw,12px)] px-1 text-h-card text-pretty text-foreground">
        {title}
      </h3>

      {description && (
        <p className="m-0 mb-[clamp(14px,1.6vw,22px)] px-1 text-small text-pretty text-muted-foreground">
          {description}
        </p>
      )}

      {price && (
        <div className="mt-auto flex flex-wrap items-baseline gap-2.5 px-1 pb-1">
          <span className="text-lead font-medium text-primary">{price}</span>
          {priceBefore && (
            <span className="text-small text-ink-42 line-through">{priceBefore}</span>
          )}
        </div>
      )}
    </>
  );
}

/**
 * The one card the concept draws twice: a "featured" hero spotlight and a "course" rail card,
 * sharing a surface, a padding, a media well and a price row but differing in enough structural
 * places - edge treatment, hover, header row, rating cluster, type scale - that a `variant` reads
 * true and a `size` prop would not.
 */
export function ContentCard({
  className,
  cover,
  dateLabel,
  description,
  eyebrow,
  href,
  price,
  priceBefore,
  rating,
  title,
  variant = "course",
}: ContentCardProps) {
  const isFeatured = variant === "featured";

  const cardClassName = cn(
    "group relative box-border flex flex-col rounded-xl bg-card p-[clamp(10px,1vw,14px)] text-foreground",
    FOCUS_RING,
    isFeatured
      ? [
          "flex-initial min-w-min shadow-lift",
          "transition-shadow duration-300 ease-out hover:shadow-float",
          "motion-reduce:transition-none",
        ]
      : [
          "flex-none border border-ink-08",
          "transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-16",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        ],
    className
  );

  const style = { width: CONTENT_CARD_WIDTH[variant] };

  const body = isFeatured ? (
    <FeaturedCardBody
      cover={cover}
      dateLabel={dateLabel}
      eyebrow={eyebrow}
      price={price}
      priceBefore={priceBefore}
      rating={rating}
      title={title}
      variant={variant}
    />
  ) : (
    <CourseCardBody
      cover={cover}
      dateLabel={dateLabel}
      description={description}
      eyebrow={eyebrow}
      price={price}
      priceBefore={priceBefore}
      rating={rating}
      title={title}
      variant={variant}
    />
  );

  if (!href) {
    return (
      <article className={cardClassName} style={style}>
        {body}
      </article>
    );
  }

  return (
    <Link className={cardClassName} href={href} style={style}>
      {body}
    </Link>
  );
}
