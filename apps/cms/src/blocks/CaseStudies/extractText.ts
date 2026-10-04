import type { CaseStudiesBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractCaseStudiesText(block: CaseStudiesBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.description,
    ...(block.items ?? []).flatMap((item) => [
      item.title,
      item.technologies,
      item.problem,
      item.solution,
      item.result,
    ]),
  ]);
}
