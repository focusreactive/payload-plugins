import { FaqJsonLd } from "@/core/seo/components";
import { SectionContainer } from "@/components/shared";
import { FaqSection } from "@/components/shared/components/FaqSection";
import type { FaqBlock as FaqBlockProps } from "@/payload-types";

export const FaqBlockComponent: React.FC<FaqBlockProps> = ({
  eyebrow,
  heading,
  description,
  items,
  section,
  id,
  ...rest
}) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <FaqJsonLd
      faq={{ eyebrow, heading, description, items, section, id, ...rest } as FaqBlockProps}
    />
    <FaqSection eyebrow={eyebrow} heading={heading} description={description} items={items} />
  </SectionContainer>
);
