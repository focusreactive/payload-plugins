import { TrackLeadAction } from "@focus-reactive/payload-plugin-analytics/client";

import { ButtonSize } from "@/components/button/types";
import { CMSLink } from "@/components/shared/CMSLink";
import type { EyebrowTone } from "@/components/Eyebrow";
import type { CtaBannerInline } from "@/payload-types";

import { CtaBanner } from "./ui";
import type { CtaBannerVariant } from "./ui";

const eyebrowToneByVariant: Record<CtaBannerVariant, EyebrowTone> = {
  accent: "default",
  dark: "accent",
  default: "accent",
};

export const CtaBannerInlineComponent: React.FC<CtaBannerInline> = ({
  actions,
  heading,
  variant,
}) => {
  const resolvedVariant: CtaBannerVariant = variant ?? "default";

  return (
    <CtaBanner
      actions={(actions ?? []).map((action) => (
        <TrackLeadAction key={action.id ?? action.link.label} on="click" type="cta_click">
          <CMSLink link={action.link} size={ButtonSize.Large} />
        </TrackLeadAction>
      ))}
      heading={{
        ...heading,
        eyebrowTone: eyebrowToneByVariant[resolvedVariant],
      }}
      variant={resolvedVariant}
    />
  );
};
