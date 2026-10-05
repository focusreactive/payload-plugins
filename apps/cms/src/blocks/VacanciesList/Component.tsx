import {
  EMPLOYMENT_TYPE_OPTIONS,
  WORKPLACE_OPTIONS,
  optionLabel,
} from "@/collections/Vacancies/options";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { getOpenVacancies } from "@/dal";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import { CAREERS_CONFIG } from "@/lib/config/careers";
import type { VacanciesListBlock } from "@/payload-types";

import { VacanciesList } from "./ui";

export async function VacanciesListBlockComponent({
  eyebrow,
  heading,
  description,
  emptyText,
  section,
  id,
}: VacanciesListBlock) {
  const vacancies = await getOpenVacancies();
  const header = prepareSectionHeaderProps({ description, eyebrow, heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && <SectionHeader {...header} className="mb-10" />}
      <VacanciesList
        emptyText={emptyText}
        items={vacancies.map((vacancy) => ({
          facts: [
            vacancy.location,
            optionLabel(WORKPLACE_OPTIONS, vacancy.workplace),
            optionLabel(EMPLOYMENT_TYPE_OPTIONS, vacancy.employmentType),
          ].flatMap((fact) => (fact ? [fact] : [])),
          href: `${CAREERS_CONFIG.basePath}/${vacancy.slug}`,
          summary: vacancy.summary,
          title: vacancy.title,
        }))}
      />
    </SectionContainer>
  );
}
