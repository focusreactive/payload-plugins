import { joinText } from "@/lib/utils/text";
import type { Person } from "@/payload-types";

export function extractPersonText(
  person: Pick<Person, "name" | "jobTitle" | "biography" | "markets">
): string {
  return joinText([person.name, person.jobTitle, person.biography, ...(person.markets ?? [])]);
}
