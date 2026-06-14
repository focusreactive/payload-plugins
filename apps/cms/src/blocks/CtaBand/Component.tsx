import { SectionContainer } from "@/core/ui";
import { CtaBandSection } from "@/core/ui/components/CtaBandSection";
import type { CtaBandBlock } from "@/payload-types";

export const CtaBandBlockComponent: React.FC<CtaBandBlock> = ({ eyebrow, heading, lead, actions, section, id }) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <CtaBandSection eyebrow={eyebrow} heading={heading} lead={lead} actions={actions} theme={section?.theme} />
  </SectionContainer>
);
