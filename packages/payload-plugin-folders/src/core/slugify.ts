export const MAX_SEGMENT_LENGTH = 96;

/** One segment: lowercase letters and digits, joined by single hyphens, underscores or dots. */
export const SEGMENT_PATTERN = /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/u;

export const SEGMENT_ERROR_MESSAGE =
  "Use lowercase letters, numbers, hyphens, underscores or dots, for example summer-sale";

// German digraphs first, because NFKD alone would turn "ü" into "u" and lose the "e".
const transliterations: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

const combiningMarks = /\p{M}/gu;
const transliterationPattern = /[äöüß]/gu;
const ampersands = /&/gu;
const outsideSegmentCharacters = /[^a-z0-9]+/gu;
const surroundingHyphens = /^-+|-+$/gu;

/**
 * Turns a title into a segment: lowercase, transliterated, `&` dropped, every run of other
 * characters becomes one hyphen, trimmed, cut to 96 characters.
 *
 * The locale is part of the signature because spec section 2.6 names it, but v1 applies the same
 * rules in every locale.
 */
export const slugify = (input: string, _locale?: string): string => {
  const slug = input
    .toLowerCase()
    .replace(transliterationPattern, (character) => transliterations[character] ?? character)
    .normalize("NFKD")
    .replace(combiningMarks, "")
    .replace(ampersands, "")
    .replace(outsideSegmentCharacters, "-")
    .replace(surroundingHyphens, "");

  // The cut can land right after a hyphen, which would leave a trailing one.
  return slug.slice(0, MAX_SEGMENT_LENGTH).replace(surroundingHyphens, "");
};

export type SegmentValidationOptions = {
  /** A site-root segment cannot contain a dot, so robots.txt and sitemap.xml stay the frontend's. */
  atSiteRoot: boolean;
};

export const isValidSegment = (
  segment: string,
  { atSiteRoot }: SegmentValidationOptions
): boolean => {
  if (segment.length < 1 || segment.length > MAX_SEGMENT_LENGTH) {
    return false;
  }
  if (atSiteRoot && segment.includes(".")) {
    return false;
  }

  return SEGMENT_PATTERN.test(segment);
};
