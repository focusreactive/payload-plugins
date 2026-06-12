import { CtaBand } from "@repo/ui";
import { ButtonSize } from "@repo/ui/components/ui/button/types";

import { SectionContainer } from "@/core/ui";
import { CMSLink } from "@/core/ui/blocks/CMSLink";
import type { CtaBandBlock } from "@/payload-types";
import type { Page, Post } from "@/payload-types";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";

export const CtaBandBlockComponent: React.FC<CtaBandBlock> = ({ eyebrow, heading, lead, actions, section, id }) => {
  const header = prepareSectionHeaderProps({ eyebrow, subtitle: lead, title: heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <CtaBand
        header={header}
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
