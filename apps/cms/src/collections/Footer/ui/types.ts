import type { PreparedMedia } from "@/components/media";
import type { SocialPlatform } from "@/components/SocialIcon";

export interface FooterLink {
  label: string;
  href: string;
  newTab?: boolean;
}

export interface FooterLinkGroup {
  label: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  platform: SocialPlatform;
  href: string;
  newTab?: boolean;
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
  socialLinks: FooterSocialLink[];
  copywriteText?: string;
}
