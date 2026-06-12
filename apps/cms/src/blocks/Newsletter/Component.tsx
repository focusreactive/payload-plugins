import { NewsletterSection } from "@repo/ui";

import { SectionContainer } from "@/core/ui";
import type { NewsletterBlock } from "@/payload-types";

export const NewsletterBlockComponent: React.FC<NewsletterBlock> = ({ badge, heading, inputPlaceholder, buttonLabel, disclaimer, section, id }) => {
  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <NewsletterSection badge={badge} heading={heading} inputPlaceholder={inputPlaceholder} buttonLabel={buttonLabel} disclaimer={disclaimer} theme={section?.theme} />
    </SectionContainer>
  );
};
