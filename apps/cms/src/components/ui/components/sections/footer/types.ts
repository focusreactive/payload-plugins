import type { IImageProps } from "../../ui/image/types";

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
  logo?: IImageProps | null;
}

export interface IFooterProps {
  brand: FooterBrand;
  description?: string;
  linkGroups: FooterLinkGroup[];
  legalLinks: FooterLink[];
  copywriteText?: string;
}
