import type { PreparedMedia } from "@/components/media";

export type ContentCardVariant = "course" | "featured";

export interface ContentCardProps {
  /** Drives the whole skeleton - width, edge treatment, hover, type scale. Not a size prop: the two read differently, they are not the same layout at two sizes. Defaults to "course". */
  variant?: ContentCardVariant;
  cover?: PreparedMedia;
  /** The small caps label above the media well ("Featured teaching") plus its arrow badge. "course" cards never show this row regardless of what is passed. */
  eyebrow?: string;
  title: string;
  /** "course" only - "featured" never renders a description, even if one is passed. */
  description?: string;
  /** Two of the three real feeds (Talk documents, Shopify products) have no rating - omit to skip the whole cluster rather than pass 0. */
  rating?: number;
  dateLabel?: string;
  /** A plain string slot, not a currency amount: a talk-fed card puts an access tier here ("Free", "Premium", "All Access"), a book-fed card a real price string. */
  price?: string;
  priceBefore?: string;
  /** Without it the card renders as an `<article>`; with it, a `next/link`. */
  href?: string;
  className?: string;
}
