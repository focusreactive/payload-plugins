import { NewsletterSection } from "@/components/newsletter";

import { SectionContainer } from "@/components/shared";
import type { NewsletterBlock } from "@/payload-types";

export const NewsletterBlockComponent: React.FC<NewsletterBlock> = ({
  heading,
  inputPlaceholder,
  buttonLabel,
  disclaimer,
  section,
  id,
}) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <NewsletterSection
      heading={heading}
      inputPlaceholder={inputPlaceholder}
      buttonLabel={buttonLabel}
      disclaimer={disclaimer}
      theme={section?.theme}
    />
  </SectionContainer>
);
