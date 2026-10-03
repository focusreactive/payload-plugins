import { SectionContainer } from "@/components/shared";
import { CtaBandSection } from "@/components/CtaBandSection";
import type { CtaBandBlock } from "@/payload-types";

export const CtaBandBlockComponent: React.FC<CtaBandBlock> = ({
  heading,
  actions,
  section,
  id,
}) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <CtaBandSection heading={heading} actions={actions} theme={section?.theme} />
  </SectionContainer>
);
