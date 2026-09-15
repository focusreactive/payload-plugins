import type { CourseRailBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

/**
 * `source` and `allTeachingsLabel` are new fields this pass added; `payload-types.ts` has not been
 * regenerated to know about them (`payload generate:types` is off-limits here - see the task
 * brief), so they are declared here until that regeneration lands centrally.
 */
interface CourseRailBlockWithSource extends CourseRailBlock {
  source?: "typed" | "talks" | null;
  allTeachingsLabel?: string | null;
}

/**
 * Every link in this block has its own label switched off (`disableLabel`), so unlike the cards
 * grid there is no link text to pull out - the button copy lives in the block's own fields.
 *
 * `courses` and `topics` keep their (localized) default values even while hidden behind
 * `source: "talks"` in the admin - Payload's `defaultValue` fills a field regardless of
 * `admin.condition`, which only hides it from view. Branching on `source` here is what keeps a
 * "talks" section from indexing placeholder course titles nobody chose and nobody sees; the real
 * talk titles behind that mode are fetched at render time and have no home on the block itself.
 */
export function extractCourseRailText(block: CourseRailBlockWithSource): string {
  const isTyped = block.source !== "talks";

  return joinText([
    block.eyebrow,
    block.heading,
    ...(isTyped ? (block.topics ?? []).map((topic) => topic.label) : [block.allTeachingsLabel]),
    block.allTopicsLabel,
    block.viewAllLabel,
    ...(isTyped
      ? (block.courses ?? []).flatMap((course) => [
          course.title,
          course.description,
          course.dateLabel,
          course.price,
        ])
      : []),
  ]);
}
