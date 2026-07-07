export interface WbLatestNewsFeatured {
  image: string;
  category: string;
  date: string;
  title: string;
  description: string;
  cta: string;
  byline: string;
  href?: string;
}

export interface WbLatestNewsItem {
  category: string;
  date: string;
  title: string;
  text: string;
  href?: string;
}

export interface WbLatestNewsProps {
  eyebrow: string;
  title: string;
  cta: string;
  ctaHref?: string;
  featured: WbLatestNewsFeatured;
  items: WbLatestNewsItem[];
}
