import { NewsletterSection } from "@repo/ui";

import { SectionContainer } from "@/core/ui";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { NewsletterBlock } from "@/payload-types";

export const NewsletterBlockComponent: React.FC<NewsletterBlock> = ({ badge, heading, inputPlaceholder, buttonLabel, disclaimer, section, id }) => {
  const header = prepareSectionHeaderProps({ eyebrow: badge, title: heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <NewsletterSection header={header} inputPlaceholder={inputPlaceholder} buttonLabel={buttonLabel} disclaimer={disclaimer} theme={section?.theme} />
    </SectionContainer>
  );
};
