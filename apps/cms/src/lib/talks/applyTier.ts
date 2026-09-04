/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/lib/talks/applyTier.ts
 *
 * The paywall. Two rules, and the second is the one that matters commercially.
 *
 *   1. A reader sees the body when the tier they hold is at least the tier the item requires.
 *   2. Everything a crawler needs stays visible at EVERY tier - title, teaser, topics, duration,
 *      the AI summary, the takeaways and "questions this talk answers". Only the body, the
 *      transcript and the audio are withheld.
 *
 * Rule 2 is the NYT-style teaser Jeff asked for by name, and it is why the gate lives here at
 * render time rather than in the collection's access control. Hiding the document would hide the
 * page from Google, which is the exact problem the engagement exists to fix. Their current
 * Magento already does the right thing by accident - the anonymous view of a gated talk carries
 * about 41% of the member text as real indexable HTML - so this preserves a behaviour they have
 * rather than inventing one.
 *
 * What this is NOT: entitlement. In the real build a person's tier comes from Braintree through
 * the identity layer, refreshed at login and invalidated by webhooks. The CMS never stores who
 * paid. The demo has no auth at all, so the tier arrives from the "view as" switch instead.
 */

import { TALK_TIERS } from "@/collections/Talk";

export type TalkTier = (typeof TALK_TIERS)[number];

export const isTalkTier = (value: unknown): value is TalkTier =>
  typeof value === "string" && (TALK_TIERS as readonly string[]).includes(value);

/** Ascending, so a numeric comparison answers "does this reader reach that tier". */
const rank = (tier: TalkTier) => TALK_TIERS.indexOf(tier);

export const tierGrantsAccess = (readerTier: TalkTier, requiredTier: TalkTier) =>
  rank(readerTier) >= rank(requiredTier);

/**
 * The minimum shape this function needs. Structural and WITHOUT an index signature on purpose:
 * an `[key: string]: unknown` member here makes Payload's generated `Talk` type unassignable to
 * it, and the resulting error surfaces three files away as "Type '{}' is not assignable to
 * ReactNode" in the renderer, which is a long way from the cause.
 */
export interface GatedTalkFields {
  requiredTier?: string | null;
  body?: unknown;
  transcript?: string | null;
  transcriptSegments?: unknown;
  audioUrl?: string | null;
}

export interface GatedResult<T> {
  talk: T;
  isLocked: boolean;
  requiredTier: TalkTier;
}

/**
 * Returns the talk with the gated fields stripped when the reader does not reach its tier.
 *
 * Stripped rather than blanked, and stripped on the SERVER, because a field that reaches the
 * browser is published whether or not a component chooses to render it. Their own site gets this
 * right today; a client-side gate would be a regression from what they already have.
 */
export function applyTier<T extends GatedTalkFields>(
  talk: T,
  readerTier: TalkTier
): GatedResult<T> {
  const requiredTier = isTalkTier(talk.requiredTier) ? talk.requiredTier : "visitor";

  if (tierGrantsAccess(readerTier, requiredTier)) {
    return { isLocked: false, requiredTier, talk };
  }

  // Destructured only to drop them from `visible`; the underscore names say so to the linter and
  // to the next reader.
  const {
    audioUrl: _audioUrl,
    body: _body,
    transcript: _transcript,
    transcriptSegments: _transcriptSegments,
    ...visible
  } = talk;
  return {
    isLocked: true,
    requiredTier,
    talk: {
      ...visible,
      audioUrl: null,
      body: null,
      transcript: null,
      transcriptSegments: null,
    } as T,
  };
}
