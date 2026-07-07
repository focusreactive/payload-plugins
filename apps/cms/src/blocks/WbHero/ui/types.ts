export interface WbHeroFeatured {
  image: string;
  category: string;
  brand: string;
  title: string;
  excerpt: string;
  cta: string;
  href: string;
}

export interface WbHeroCompactCard {
  label: string;
  status: string;
  title: string;
  text: string;
  cta: string;
  brand: string;
  href: string;
}

export interface WbHeroTodayLink {
  brand: string;
  title: string;
  href: string;
}

export interface WbHeroProps {
  eyebrow: string;
  title: string;
  date: string;
  featured: WbHeroFeatured;
  compactCards: WbHeroCompactCard[];
  todayLinks: WbHeroTodayLink[];
  showTodayStrip?: boolean;
}
