import { CtaBand } from "@repo/ui";
import { ButtonSize } from "@repo/ui/components/ui/button/types";

import { CMSLink } from "@/core/ui/blocks/CMSLink";
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
  lead?: string | null;
  actions?: CtaBandSectionAction[] | null;
  theme?: string | null;
}

export function CtaBandSection({ eyebrow, heading, lead, actions, theme }: CtaBandSectionProps) {
  const header = prepareSectionHeaderProps({ eyebrow, subtitle: lead, title: heading });

  return (
    <CtaBand
      header={header}
      theme={theme}
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
  );
}
