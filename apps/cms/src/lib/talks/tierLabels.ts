/**
 * The one place a membership tier becomes words a reader sees, and the one place that decides
 * whether an item is drawn as locked.
 *
 * There were three copies of the map and they had drifted. The same `visitor` item read "Readable"
 * on the homepage listing and "Free" on a topic page, and only the listings drew a lock. Those
 * pages are walked one after the other, so a disagreement about what a tier is called is visible
 * to whoever is watching.
 *
 * Every label is title-cased, including the one that lands mid-sentence in the locked notice - the
 * notice used to interpolate the raw enum value ("all-access") next to title-cased switch buttons.
 */

import type { TalkTier } from "./applyTier";
import { isTalkTier } from "./applyTier";

/**
 * `visitor` is the absence of a membership rather than a tier the client sells, so it is named for
 * what the reader gets instead of for a product that does not exist.
 */
const TIER_LABELS: Record<TalkTier, string> = {
  "all-access": "All Access",
  basic: "Basic",
  premium: "Premium",
  visitor: "Free",
};

/** An unknown or missing value falls back to the least, the same way getReaderTier() does. */
export const tierLabel = (tier: unknown): string =>
  TIER_LABELS[isTalkTier(tier) ? tier : "visitor"];

export interface TierBadge {
  label: string;
  /** True when the item's body needs a membership, which is what puts a lock on the badge. */
  isGated: boolean;
  /** What a screen reader gets, because the lock glyph beside the label is decorative. */
  description: string;
}

/**
 * The badge states what the ITEM requires, never what the reader holds. Two things follow from
 * that: a listing rendering it needs no per-reader cookie and so caches for everyone, and the same
 * card cannot read one way on a topic page and another way on the homepage.
 *
 * The reader's own position is shown where it changes what they can do - the notice on a locked
 * talk, and the "view as" switch - rather than on every row of every listing.
 */
export const tierBadge = (requiredTier: unknown): TierBadge => {
  const tier = isTalkTier(requiredTier) ? requiredTier : "visitor";
  const label = TIER_LABELS[tier];
  const isGated = tier !== "visitor";

  return {
    description: isGated ? `Members only: ${label}` : "Free to read",
    isGated,
    label,
  };
};

/**
 * The badge chrome, exported rather than written at each render site so it cannot drift again.
 * `text-eyebrow` is the system's mono/uppercase/letter-spaced label treatment.
 */
export const TIER_BADGE_CLASS =
  "text-eyebrow inline-flex w-fit items-center gap-1.5 rounded-pill border px-2.5 py-1";

export const tierBadgeToneClass = (isGated: boolean): string =>
  isGated
    ? "border-primary/40 bg-primary-soft text-primary"
    : "border-border bg-muted text-muted-foreground";
