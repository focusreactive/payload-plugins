import type { PreparedMedia } from "@/components/media";

/**
 * A static, editor-authored chip: a plain label, or a link when the editor set one. Picking one
 * never filters `courses` - the editor already curated that array by hand, exactly as before this
 * pass.
 */
export interface CourseRailStaticTopic {
  label: string;
  href?: string;
  isSelected: boolean;
}

/**
 * A real filter chip, derived from the topics actually present on the fetched talks. `topicSlug`
 * is `null` only for the sentinel ("All teachings") - clicking it clears the filter rather than
 * filtering to a topic literally named null.
 */
export interface CourseRailFilterTopic {
  label: string;
  topicSlug: string | null;
}

/**
 * "static" is today's hand-entered courses array with decorative-or-navigating chips. "filter" is
 * real Talk documents with chips that filter `courses` in memory, client-side, no refetch.
 */
export type CourseRailTopics =
  | { mode: "static"; topics: CourseRailStaticTopic[] }
  | { mode: "filter"; topics: CourseRailFilterTopic[] };

export interface CourseRailCourse {
  cover: PreparedMedia;
  title: string;
  description?: string;
  /** Two of the three real feeds behind this block have no rating - omit it rather than pass 0. */
  rating?: number;
  /** A talk-fed card has no rating to show, so its kind ("Short Talk", "Article"...) takes that slot instead - ContentCard already drops a rated card's eyebrow in favour of the stars. */
  eyebrow?: string;
  dateLabel?: string;
  /** A talk-fed card puts its access tier here ("Free", "Premium", "All Access") instead of a price. */
  price?: string;
  priceBefore?: string;
  /** Empty only for a "static" course with no link chosen - the card then renders as an article. Always set for a "filter" (talk) course. */
  href?: string;
  /** Read only when `topics.mode` is "filter" - which topics this course belongs to, for the client-side filter to match against. Unused for "static". */
  topicSlugs?: string[];
}

export interface CourseRailProps {
  eyebrow?: string;
  heading: string;
  topics: CourseRailTopics;
  allTopicsLabel?: string;
  allTopicsHref?: string;
  viewAllLabel?: string;
  viewAllHref?: string;
  courses: CourseRailCourse[];
}
