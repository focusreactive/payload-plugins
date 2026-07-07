export interface WbEventsFeatured {
  image: string;
  pill: string;
  date: string;
  location: string;
  title: string;
  description: string;
  cta: string;
  href?: string;
}

export interface WbEventsCard {
  type: string;
  date: string;
  location: string;
  title: string;
  description: string;
  cta: string;
  href?: string;
}

export interface WbEventsProps {
  eyebrow: string;
  title: string;
  cta?: string;
  ctaHref?: string;
  featured: WbEventsFeatured;
  events: WbEventsCard[];
}
