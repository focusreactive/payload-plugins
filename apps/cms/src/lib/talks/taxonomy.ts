/**
 * The two vocabularies a talk is filed under, and the words a human reads for each.
 *
 * This module imports nothing, which is the point. The stored values used to live in the
 * collection config and the reader-facing words in tierLabels.ts, so the admin panel derived its
 * own labels by title-casing the raw value and the site derived different ones from a map. The
 * editor picking "all-access" in a dropdown and the visitor reading "All Access" on the badge were
 * looking at the same field through two spellings, and "student-qa" title-cased to "Student Qa" on
 * both. One map, read by the config, the renderer and the client component alike.
 *
 * Adding a kind or a tier means adding its label here in the same edit - the Record types make a
 * missing one a compile error rather than a mangled word in the panel.
 */

/** Ascending. applyTier() compares positions in this array, so the ORDER is load-bearing. */
export const TALK_TIERS = ["visitor", "basic", "premium", "all-access"] as const;

export const TALK_KINDS = [
  "featured-talk",
  "short-talk",
  "special-lesson",
  "student-qa",
  "study-group-discussion",
  "article",
  "blog",
  "letter",
  "insight-timer-talk",
] as const;

export type TalkTier = (typeof TALK_TIERS)[number];
export type TalkKind = (typeof TALK_KINDS)[number];

/**
 * `visitor` is the absence of a membership rather than a tier that is sold, so it is named for what
 * the reader gets instead of for a product that does not exist.
 */
export const TIER_LABELS: Record<TalkTier, string> = {
  "all-access": "All Access",
  basic: "Basic",
  premium: "Premium",
  visitor: "Free",
};

/**
 * Their own words, taken from the archive's navigation rather than from the stored value. Two would
 * be wrong if a machine derived them: "student-qa" title-cases to "Student Qa", and "Insight Timer"
 * is a product name that has to keep its capitals.
 */
export const KIND_LABELS: Record<TalkKind, string> = {
  article: "Article",
  blog: "Blog",
  "featured-talk": "Featured Talk",
  "insight-timer-talk": "Insight Timer Talk",
  letter: "Letter",
  "short-talk": "Short Talk",
  "special-lesson": "Special Lesson",
  "student-qa": "Student Q&A",
  "study-group-discussion": "Study Group Discussion",
};

export const isTalkTier = (value: unknown): value is TalkTier =>
  typeof value === "string" && (TALK_TIERS as readonly string[]).includes(value);

export const isTalkKind = (value: unknown): value is TalkKind =>
  typeof value === "string" && (TALK_KINDS as readonly string[]).includes(value);

/** An unknown or missing value falls back to the least, the same way getReaderTier() does. */
export const tierLabel = (tier: unknown): string =>
  TIER_LABELS[isTalkTier(tier) ? tier : "visitor"];

export const kindLabel = (kind: unknown): string | null =>
  isTalkKind(kind) ? KIND_LABELS[kind] : null;

export const talkKindOptions = () =>
  TALK_KINDS.map((value) => ({ label: KIND_LABELS[value], value }));

/**
 * The editor is choosing what gates the item, so "Free" alone would leave them guessing whether it
 * means free to read or free of charge. Every other tier keeps the word the reader sees, because an
 * editor who sets "Premium" and then finds "Premium" on the page has had the CMS confirm itself.
 */
export const talkTierOptions = () =>
  TALK_TIERS.map((value) => ({
    label: value === "visitor" ? "Free - anyone can read it" : TIER_LABELS[value],
    value,
  }));
