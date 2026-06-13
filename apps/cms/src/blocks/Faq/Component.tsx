import { FaqJsonLd } from "@/core/seo/components";
import { SectionContainer } from "@/core/ui";
import { FaqSection } from "@/core/ui/components/FaqSection";
import type { FaqBlock as FaqBlockProps } from "@/payload-types";

export const FaqBlockComponent: React.FC<FaqBlockProps> = ({ eyebrow, heading, lead, items, section, id, ...rest }) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <FaqJsonLd faq={{ eyebrow, heading, lead, items, section, id, ...rest } as FaqBlockProps} />
    <FaqSection eyebrow={eyebrow} heading={heading} lead={lead} items={items} />
  </SectionContainer>
);
