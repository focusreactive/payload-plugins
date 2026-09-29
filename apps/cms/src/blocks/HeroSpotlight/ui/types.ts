export interface IHeroSpotlightImage {
  src: string;
  alt: string;
}

export interface IHeroSpotlightCta {
  href: string;
  label: string;
  opensInNewTab: boolean;
}

export interface IHeroSpotlightCard {
  label?: string | null;
  image: IHeroSpotlightImage;
  title: string;
  rating?: string | null;
  /** Machine-readable day for `<time dateTime>`, already trimmed to YYYY-MM-DD. */
  dateIso?: string | null;
  /** The same day already formatted for the reader's locale; the card upper-cases it in CSS. */
  dateLabel?: string | null;
  price?: string | null;
  compareAtPrice?: string | null;
  href: string;
  opensInNewTab: boolean;
}

export interface IHeroSpotlightProps {
  eyebrow?: string | null;
  heading: string;
  introText?: string | null;
  backgroundImage: IHeroSpotlightImage;
  /** A CSS `object-position` value, chosen by the editor from a named list of focal points. */
  backgroundObjectPosition: string;
  /** 0-60, the percentage of extra black laid over the photograph. */
  photoDarkening: number;
  ctaLink?: IHeroSpotlightCta | null;
  featuredCard?: IHeroSpotlightCard | null;
}
