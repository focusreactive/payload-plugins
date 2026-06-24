import { Stats } from "./ui";
import { SectionContainer } from "@/components/shared";
import type { StatsBlock } from "@/payload-types";

export const StatsBlockComponent: React.FC<StatsBlock> = ({ items, section, id }) => {
  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <Stats items={items ?? []} />
    </SectionContainer>
  );
};
