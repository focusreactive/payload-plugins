import { Chart } from "@repo/ui";

import { SectionContainer } from "@/core/ui";
import type { ChartBlock } from "@/payload-types";

export const ChartBlockComponent: React.FC<ChartBlock> = ({ title, subtitle, ranges, section, id }) => {
  const cleanRanges = (ranges ?? []).map((range) => ({
    label: range.label,
    dataPoints: (range.dataPoints ?? []).filter((point) => typeof point.value === "number").map((point) => ({ label: point.label, value: point.value })),
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <Chart title={title} subtitle={subtitle} ranges={cleanRanges} />
    </SectionContainer>
  );
};
