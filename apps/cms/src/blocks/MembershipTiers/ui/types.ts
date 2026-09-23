import type { PreparedMedia } from "@/components/media";

export type BillingPeriod = "monthly" | "annual";

export type TierEmphasis = "standard" | "featured";

export interface IMembershipTier {
  name: string;
  emphasis: TierEmphasis;
  tagline?: string;
  badge?: string;
  priceMonthly: string;
  priceAnnual?: string;
  ctaHref: string;
  ctaLabel: string;
  featuresHeading?: string;
  features: string[];
}

export interface IMembershipTiersProps {
  backgroundImage: PreparedMedia;
  eyebrow?: string;
  heading: string;
  showBillingToggle: boolean;
  defaultPeriod: BillingPeriod;
  monthlyLabel: string;
  annualLabel: string;
  savingsBadge?: string;
  monthlyPeriodSuffix?: string;
  annualPeriodSuffix?: string;
  tiers: IMembershipTier[];
}
