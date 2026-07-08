import type { PreparedMedia } from "@/components/media";

export interface FooterLink {
  label: string;
  href: string;
  newTab?: boolean;
}

export interface FooterLinkGroup {
  label: string;
  links: FooterLink[];
}

export interface FooterBrand {
  label: string;
  href: string;
  logo?: PreparedMedia | null;
}

export interface IFooterProps {
  brand: FooterBrand;
  description?: string;
  linkGroups: FooterLinkGroup[];
  legalLinks: FooterLink[];
  copywriteText?: string;
}
