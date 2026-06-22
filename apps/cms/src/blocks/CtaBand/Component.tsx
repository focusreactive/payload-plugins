import { SectionContainer } from "@/components/shared";
import { CtaBandSection } from "@/components/shared/components/CtaBandSection";
import type { CtaBandBlock } from "@/payload-types";

export const CtaBandBlockComponent: React.FC<CtaBandBlock> = ({ eyebrow, heading, description, actions, section, id }) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <CtaBandSection eyebrow={eyebrow} heading={heading} description={description} actions={actions} theme={section?.theme} />
  </SectionContainer>
);
