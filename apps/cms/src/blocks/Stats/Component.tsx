import { Stats } from "@/components/ui";
import { SectionContainer } from "@/core/ui";
import type { StatsBlock } from "@/payload-types";

export const StatsBlockComponent: React.FC<StatsBlock> = ({ items, section, id }) => {
  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <Stats items={items ?? []} />
    </SectionContainer>
  );
};
