import { Chart, SectionHeader } from "@repo/ui";

import { SectionContainer } from "@/core/ui";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { ChartBlock } from "@/payload-types";

export const ChartBlockComponent: React.FC<ChartBlock> = ({ eyebrow, heading, lead, title, subtitle, ranges, section, id }) => {
  const cleanRanges = (ranges ?? []).map((range) => ({
    label: range.label,
    dataPoints: (range.dataPoints ?? []).filter((point) => typeof point.value === "number").map((point) => ({ label: point.label, value: point.value })),
  }));

  const header = prepareSectionHeaderProps({ eyebrow, subtitle: lead, title: heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && <SectionHeader {...header} className="mb-12" />}
      <Chart title={title} subtitle={subtitle} ranges={cleanRanges} />
    </SectionContainer>
  );
};
