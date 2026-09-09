/**
 * The plain-text formatting the talk page, the topic page and the listing block all need.
 *
 * It lives here rather than in one of the three because each carried its own copy and the copies
 * disagreed: the same `kind` rendered "Featured Talk" on a listing and "featured talk" on the talk
 * page, and two different character budgets cut the same teaser at two different points.
 */

export const formatTalkKind = (kind?: string | null): string | null =>
  kind ? kind.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()) : null;

export const formatTalkDuration = (seconds?: number | null): string | null => {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/**
 * Trailing punctuation left dangling by the cut. Without this a teaser cut after "invitation,"
 * reads "invitation,…" rather than "invitation…".
 */
const TRAILING_PUNCTUATION = /[\s,;:.!?–—-]+$/u;

/**
 * Cuts a teaser to a budget on a word boundary and marks the cut with an ellipsis.
 *
 * `teaser.slice(0, n)` is what the pages did, and it ended 13 of the 16 cards on the listing
 * mid-word with no ellipsis, so a card looked truncated by a bug rather than by design.
 */
export function excerptAtWord(text: string | null | undefined, maxChars: number): string | null {
  if (!text) return null;

  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  // One character past the budget, so a boundary landing exactly on the limit is still found.
  const candidate = trimmed.slice(0, maxChars + 1);
  const lastBoundary = candidate.lastIndexOf(" ");
  // A single word longer than the whole budget leaves no boundary to honour, so a hard cut is the
  // only option left. Not a case the client's teasers contain, but the alternative is an empty
  // excerpt.
  const cut = lastBoundary > 0 ? candidate.slice(0, lastBoundary) : trimmed.slice(0, maxChars);

  return `${cut.replace(TRAILING_PUNCTUATION, "")}…`;
}
