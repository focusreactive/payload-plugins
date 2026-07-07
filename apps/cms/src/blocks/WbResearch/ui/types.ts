export interface WbResearchFeatured {
  image: string;
  pill: string;
  meta: string;
  title: string;
  excerpt: string;
  cta: string;
  href?: string;
}

export interface WbResearchItem {
  date: string;
  type: string;
  title: string;
  desc: string;
  cta: string;
  href?: string;
}

export interface WbResearchProps {
  eyebrow: string;
  title: string;
  cta: string;
  ctaHref?: string;
  featured: WbResearchFeatured;
  items: WbResearchItem[];
}
