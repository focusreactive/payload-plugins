import { SectionContainer } from "@/core/ui";
import { CtaBandSection } from "@/core/ui/components/CtaBandSection";
import type { CtaBandBlock } from "@/payload-types";

export const CtaBandBlockComponent: React.FC<CtaBandBlock> = ({ eyebrow, heading, description, actions, section, id }) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <CtaBandSection eyebrow={eyebrow} heading={heading} description={description} actions={actions} theme={section?.theme} />
  </SectionContainer>
);
