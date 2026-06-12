import { CtaBand } from "@repo/ui";
import { ButtonSize } from "@repo/ui/components/ui/button/types";

import { SectionContainer } from "@/core/ui";
import { CMSLink } from "@/core/ui/blocks/CMSLink";
import type { CtaBandBlock } from "@/payload-types";
import type { Page, Post } from "@/payload-types";

export const CtaBandBlockComponent: React.FC<CtaBandBlock> = ({ badge, heading, lead, actions, section, id }) => {
  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <CtaBand
        badge={badge}
        heading={heading}
        lead={lead}
        theme={section?.theme}
        actions={(actions ?? []).map((action) => (
          <CMSLink
            key={action.id ?? action.label}
            type={action.type}
            reference={
              action.reference
                ? {
                    relationTo: action.reference.relationTo as "page" | "posts",
                    value: action.reference.value as Page | Post | string | number,
                  }
                : null
            }
            url={action.url}
            newTab={action.newTab}
            label={action.label}
            appearance={action.appearance}
            size={ButtonSize.Large}
          />
        ))}
      />
    </SectionContainer>
  );
};
