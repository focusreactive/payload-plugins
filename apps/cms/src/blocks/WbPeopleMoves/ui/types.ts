export interface WbPeopleMovesItem {
  date: string;
  category: string;
  region: string;
  title: string;
  href?: string;
}

export interface WbPeopleMovesProps {
  eyebrow?: string;
  title?: string;
  cta?: string;
  ctaHref?: string;
  items: WbPeopleMovesItem[];
}
