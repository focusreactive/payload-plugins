import { FaqJsonLd } from "@/components/seo/components";
import { SectionContainer } from "@/components/shared";
import { FaqSection } from "@/components/FaqSection";
import type { FaqBlock as FaqBlockProps } from "@/payload-types";

export const FaqBlockComponent: React.FC<FaqBlockProps> = (faq) => (
  <SectionContainer sectionData={{ ...faq.section, id: faq.id }}>
    <FaqJsonLd faq={faq} />
    <FaqSection heading={faq.heading} items={faq.items} />
  </SectionContainer>
);
