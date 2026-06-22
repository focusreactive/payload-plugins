import { TrackLeadAction } from "@focus-reactive/payload-plugin-analytics/client";
import { CtaBand } from "@/components/ui";
import { ButtonSize } from "@/components/ui/primitives/button/types";

import { CMSLink } from "@/components/shared/blocks/CMSLink";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { Page, Post } from "@/payload-types";

export interface CtaBandSectionAction {
  type?: ("reference" | "custom" | "customPage") | null;
  newTab?: boolean | null;
  reference?:
    | ({
        relationTo: "page";
        value: number | Page;
      } | null)
    | ({
        relationTo: "posts";
        value: number | Post;
      } | null);
  url?: string | null;
  label: string;
  appearance?: ("default" | "outline" | "accent" | "ghost" | "link") | null;
  id?: string | null;
}

interface CtaBandSectionProps {
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  actions?: CtaBandSectionAction[] | null;
  theme?: string | null;
}

export function CtaBandSection({ eyebrow, heading, description, actions, theme }: CtaBandSectionProps) {
  const header = prepareSectionHeaderProps({ eyebrow, description, heading });

  return (
    <CtaBand
      header={header}
      theme={theme}
      actions={(actions ?? []).map((action) => (
        <TrackLeadAction key={action.id ?? action.label} on="click" type="cta_click">
          <CMSLink
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
        </TrackLeadAction>
      ))}
    />
  );
}
