import { TrackLeadAction } from "@focus-reactive/payload-plugin-analytics/client";

import { ButtonSize } from "@/components/button/types";
import { CMSLink } from "@/components/shared/CMSLink";
import type { SectionHeaderEyebrow } from "@/components/SectionHeader";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { CtaBannerInline, Page, Post } from "@/payload-types";

import { CtaBanner } from "./ui";
import type { CtaBannerVariant } from "./ui";

const eyebrowToneByVariant: Record<CtaBannerVariant, SectionHeaderEyebrow["variant"]> = {
  accent: "default",
  dark: "accent",
  default: "accent",
};

export const CtaBannerInlineComponent: React.FC<CtaBannerInline> = ({
  actions,
  description,
  eyebrow,
  heading,
  variant,
}) => {
  const resolvedVariant: CtaBannerVariant = variant ?? "default";

  const header = prepareSectionHeaderProps({
    align: "left",
    description,
    eyebrow,
    eyebrowVariant: eyebrowToneByVariant[resolvedVariant],
    heading,
    size: "h-section",
  });

  return (
    <CtaBanner
      actions={(actions ?? []).map((action) => (
        <TrackLeadAction key={action.id ?? action.label} on="click" type="cta_click">
          <CMSLink
            appearance={action.appearance}
            label={action.label}
            newTab={action.newTab}
            reference={
              action.reference
                ? {
                    relationTo: action.reference.relationTo as "page" | "posts",
                    value: action.reference.value as Page | Post | string | number,
                  }
                : null
            }
            size={ButtonSize.Large}
            type={action.type}
            url={action.url}
          />
        </TrackLeadAction>
      ))}
      header={header}
      variant={resolvedVariant}
    />
  );
};
