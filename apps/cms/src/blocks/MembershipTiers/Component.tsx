import { MembershipTiers } from "./ui";
import { SectionContainer } from "@/components/shared";
import type { PreparedMedia } from "@/components/media";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { MembershipTiersBlock } from "@/payload-types";

import type { IMembershipTier } from "./ui/types";

/** The photograph the concept ships with. It stands in until an editor uploads a replacement. */
const CONCEPT_BACKGROUND: PreparedMedia = {
  data: {
    alt: "Wildflowers at dusk",
    kind: "image",
    src: "/design/background-01-plus.webp",
  },
  imageProps: { fit: "cover", quality: 85 },
};

export async function MembershipTiersBlockComponent({
  eyebrow,
  heading,
  backgroundImage,
  billing,
  tiers,
  section,
  id,
}: MembershipTiersBlock) {
  const locale = await resolveLocale();

  const uploadedBackground = prepareMediaProps(backgroundImage ?? null);
  const background = uploadedBackground.data.src ? uploadedBackground : CONCEPT_BACKGROUND;

  const plans: IMembershipTier[] = (tiers ?? []).map((tier) => {
    const button = prepareLinkProps(tier.link, locale);

    return {
      badge: tier.badge ?? undefined,
      ctaHref: button.href,
      ctaLabel: button.text,
      emphasis: tier.emphasis === "featured" ? "featured" : "standard",
      features: (tier.features ?? []).map((feature) => feature.label),
      featuresHeading: tier.featuresHeading ?? undefined,
      name: tier.name,
      priceAnnual: tier.priceAnnual ?? undefined,
      priceMonthly: tier.priceMonthly,
      tagline: tier.tagline ?? undefined,
    };
  });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <MembershipTiers
        annualLabel={billing?.annualLabel ?? ""}
        annualPeriodSuffix={billing?.annualPeriodSuffix ?? undefined}
        backgroundImage={background}
        defaultPeriod={billing?.defaultPeriod === "annual" ? "annual" : "monthly"}
        eyebrow={eyebrow ?? undefined}
        heading={heading}
        monthlyLabel={billing?.monthlyLabel ?? ""}
        monthlyPeriodSuffix={billing?.monthlyPeriodSuffix ?? undefined}
        savingsBadge={billing?.savingsBadge ?? undefined}
        showBillingToggle={billing?.showBillingToggle ?? true}
        tiers={plans}
      />
    </SectionContainer>
  );
}
