import { cn } from "@/components/utils";

const STAR_PATH = "M6 .8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 9l-3.2 1.7.6-3.6L.8 4.6l3.6-.5z";
const STAR_COUNT = 5;

/**
 * The concept draws a partial star as a whole star in a lighter green, never a clip-path or a
 * half-star path - three discrete fill steps per star, read straight off the concept's own
 * `renderVals()`: `rating >= n + 0.75` full, `>= n + 0.25` mid, otherwise empty.
 */
function starFillClassName(rating: number, starIndex: number): string {
  if (rating >= starIndex + 0.75) return "text-primary";
  if (rating >= starIndex + 0.25) return "text-accent";
  return "text-mint-200";
}

export interface StarRatingProps {
  /** 0-5. Not clamped - the concept never passes an out-of-range value, and a caller with one should see it rather than have it silently absorbed. */
  rating: number;
  className?: string;
}

/**
 * Five graded stars plus the numeral, its own span - the "course" card's rating cluster.
 *
 * Five identical, unlabelled glyphs read as nothing to a screen reader and the printed figure
 * alone reads as a bare number, so both visible parts are hidden and a single sentence carries
 * the meaning.
 */
export function StarRating({ className, rating }: StarRatingProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span aria-hidden className="flex items-center gap-0.5">
        {Array.from({ length: STAR_COUNT }, (_, starIndex) => (
          <svg
            className={starFillClassName(rating, starIndex)}
            fill="currentColor"
            height="13"
            key={starIndex}
            viewBox="0 0 12 12"
            width="13"
          >
            <path d={STAR_PATH} />
          </svg>
        ))}
      </span>
      <span className="sr-only">{`Rated ${rating.toFixed(1)} out of 5`}</span>
      <span aria-hidden className="text-[13px] font-medium tabular-nums text-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export interface RatingGlyphProps {
  rating: number;
  className?: string;
}

/**
 * One star, always green, sharing a span with the numeral - the "featured" card's rating, which
 * never grades its fill because the concept only ever shows its single featured teaching at a
 * fixed 4.9. The graded-fill logic stays in `StarRating` alone; a five-star cluster and a
 * one-star badge don't belong behind the same `count` prop.
 */
export function RatingGlyph({ className, rating }: RatingGlyphProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span aria-hidden className="flex items-center gap-1 text-[12px] font-medium text-foreground">
        <svg
          className="text-primary"
          fill="currentColor"
          height="12"
          viewBox="0 0 12 12"
          width="12"
        >
          <path d={STAR_PATH} />
        </svg>
        {rating.toFixed(1)}
      </span>
      <span className="sr-only">{`Rated ${rating.toFixed(1)} out of 5`}</span>
    </span>
  );
}
