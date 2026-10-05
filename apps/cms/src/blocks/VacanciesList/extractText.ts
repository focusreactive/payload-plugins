import type { VacanciesListBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractVacanciesListText(block: VacanciesListBlock): string {
  return joinText([block.eyebrow, block.heading, block.description]);
}
