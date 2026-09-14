import type { CourseRailBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

/**
 * Every link in this block has its own label switched off (`disableLabel`), so unlike the cards
 * grid there is no link text to pull out - the button copy lives in the block's own fields.
 */
export function extractCourseRailText(block: CourseRailBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    ...(block.topics ?? []).map((topic) => topic.label),
    block.allTopicsLabel,
    block.viewAllLabel,
    ...(block.courses ?? []).flatMap((course) => [
      course.title,
      course.description,
      course.dateLabel,
      course.price,
    ]),
  ]);
}
