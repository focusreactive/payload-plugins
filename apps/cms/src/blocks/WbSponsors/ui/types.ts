export interface WbSponsorsCta {
  label: string;
  href?: string;
}

export interface WbSponsorCard {
  title: string;
  description: string;
  includes: string[];
  cta: string;
  href?: string;
}

export interface WbSponsorsProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: WbSponsorsCta;
  secondaryCta: WbSponsorsCta;
  /** Left-hand label for the logo strip. Newlines render as line breaks. */
  trustedLabel: string;
  partnerLogos: string[];
  cards: WbSponsorCard[];
}
