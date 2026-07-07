export interface WbFeaturedItem {
  image: string;
  category: string;
  brand: string;
  title: string;
  description: string;
  date: string;
  href?: string;
}

export interface WbFeaturedProps {
  eyebrow: string;
  title: string;
  cta?: string;
  ctaHref?: string;
  items: WbFeaturedItem[];
}
