export interface WbAwardItem {
  region: string;
  title: string;
  description: string;
  cta: string;
  href: string;
}

export interface WbAwardsProps {
  eyebrow: string;
  title: string;
  cta?: string;
  ctaHref?: string;
  items: WbAwardItem[];
}
