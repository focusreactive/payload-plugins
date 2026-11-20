import { TrackLeadAction } from "@focus-reactive/payload-plugin-analytics/client";
import { CtaBand } from "@/components/ctaBand";
import { ButtonSize } from "@/components/button/types";

import { CMSLink } from "@/components/shared/CMSLink";
import type { SectionHeadingContent } from "@/components/SectionHeading";
import type { LinkFieldValue } from "@/lib/adapters/prepareLinkProps";

export interface CtaBandSectionAction {
  id?: string | null;
  link: LinkFieldValue;
}

interface CtaBandSectionProps {
  heading?: SectionHeadingContent | null;
  actions?: CtaBandSectionAction[] | null;
  theme?: string | null;
}

export function CtaBandSection({ heading, actions, theme }: CtaBandSectionProps) {
  return (
    <CtaBand
      heading={heading}
      theme={theme}
      actions={(actions ?? []).map((action) => (
        <TrackLeadAction key={action.id ?? action.link.label} on="click" type="cta_click">
          <CMSLink link={action.link} size={ButtonSize.Large} />
        </TrackLeadAction>
      ))}
    />
  );
}
