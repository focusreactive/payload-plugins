import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { CaseStudiesBlock } from "@/payload-types";

import { CASE_STUDY_SECTORS } from "./config";
import { CaseStudies } from "./ui";

function sectorLabel(value: string): string {
  const option = CASE_STUDY_SECTORS.find(
    (entry) => typeof entry === "object" && entry.value === value
  );
  const label = typeof option === "object" ? option.label : value;
  return typeof label === "string" ? label : ((label as Record<string, string>)?.en ?? value);
}

export function CaseStudiesBlockComponent({
  eyebrow,
  heading,
  description,
  filterSector,
  items,
  section,
  id,
}: CaseStudiesBlock) {
  const visible = (items ?? []).filter(
    (item) => !filterSector || filterSector === "all" || item.sector === filterSector
  );
  const header = prepareSectionHeaderProps({ description, eyebrow, heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && <SectionHeader {...header} className="mb-10" />}
      <CaseStudies
        labels={{ problem: "The problem", result: "Business result", solution: "Our solution" }}
        items={visible.map((item) => ({
          problem: item.problem,
          result: item.result,
          sectorLabel: sectorLabel(item.sector),
          solution: item.solution,
          technologies: (item.technologies ?? "")
            .split(",")
            .map((tech) => tech.trim())
            .filter(Boolean),
          title: item.title,
        }))}
      />
    </SectionContainer>
  );
}
