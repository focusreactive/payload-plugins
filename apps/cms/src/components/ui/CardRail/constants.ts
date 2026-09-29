/**
 * The rail's shape, split out of `useCardRail` so a server component can read it. Importing a plain
 * constant out of a `"use client"` module gives the server a client-reference proxy rather than the
 * string, so `TalkGrid/ui` (server-rendered) would get an unusable value from there.
 */

/**
 * 3.28 tracks across the rail's own width, which is what leaves a slice of the fourth card visible
 * as the signal that the row scrolls. It is applied as `grid-auto-columns` on the rail, never as a
 * width on the card: a grid track is exactly the width it is told to be whatever it contains, where
 * a `100%` on the card only resolved correctly when the card was a direct child of the rail.
 *
 * It stays an inline style rather than an arbitrary Tailwind value because a clamp nested inside a
 * calc does not survive the class-name escape: the spaces CSS requires around the minus sign
 * collide with Tailwind's underscore escape inside the inner clamp's own comma list.
 */
export const CARD_RAIL_ITEM_WIDTH =
  "clamp(260px, calc((100% - 2 * clamp(16px, 1.6vw, 24px)) / 3.28), 460px)";

/**
 * The gap is not a free choice: it is the same `clamp(16px,1.6vw,24px)` that
 * `CARD_RAIL_ITEM_WIDTH` divides against, so a different one here would make the tracks stop
 * landing exactly 3.28-to-a-rail.
 */
export const CARD_RAIL_CLASS =
  "scrollbar-none grid cursor-grab grid-flow-col items-stretch gap-[clamp(16px,1.6vw,24px)] overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-proximity motion-safe:scroll-smooth";
