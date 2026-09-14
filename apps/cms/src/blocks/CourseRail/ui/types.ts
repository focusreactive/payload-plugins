import type { PreparedMedia } from "@/components/media";

export interface CourseRailTopic {
  label: string;
  /** Empty when the editor chose no destination - the chip then renders as a plain label. */
  href?: string;
  isSelected: boolean;
}

export interface CourseRailCourse {
  cover: PreparedMedia;
  title: string;
  description?: string;
  rating?: number;
  dateLabel?: string;
  price?: string;
  priceBefore?: string;
  /** Empty when the editor chose no destination - the card then renders as an article. */
  href?: string;
}

export interface CourseRailProps {
  eyebrow?: string;
  heading: string;
  topics: CourseRailTopic[];
  allTopicsLabel?: string;
  allTopicsHref?: string;
  viewAllLabel?: string;
  viewAllHref?: string;
  courses: CourseRailCourse[];
}
