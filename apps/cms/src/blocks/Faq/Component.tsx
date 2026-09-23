import { FaqJsonLd } from "@/components/seo/components";
import { SectionContainer } from "@/components/shared";
import { FaqSection } from "@/components/FaqSection";
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
  <SectionContainer
    // faq-accordion-03 carries its own padding and container.
    sectionData={{ ...section, id, paddingY: "none", paddingX: "none", maxWidth: "none" }}
  >
    <FaqJsonLd
      faq={{ eyebrow, heading, description, items, section, id, ...rest } as FaqBlockProps}
    />
    <FaqSection eyebrow={eyebrow} heading={heading} description={description} items={items} />
  </SectionContainer>
);
