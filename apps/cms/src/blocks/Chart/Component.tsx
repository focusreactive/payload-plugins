import { SectionHeading } from "@/components/SectionHeading";
import { Chart } from "./ui";

import { SectionContainer } from "@/components/shared";
import type { ChartBlock } from "@/payload-types";

export const ChartBlockComponent: React.FC<ChartBlock> = ({
  heading,
  title,
  subtitle,
  ranges,
  section,
  id,
}) => {
  const cleanRanges = (ranges ?? []).map((range) => ({
    label: range.label,
    dataPoints: (range.dataPoints ?? [])
      .filter((point) => typeof point.value === "number")
      .map((point) => ({ label: point.label, value: point.value })),
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <SectionHeading {...heading} className="mb-12" />
      <Chart title={title} subtitle={subtitle} ranges={cleanRanges} />
    </SectionContainer>
  );
};
