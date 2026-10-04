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

export type FooterSocialPlatform = "linkedin" | "mastodon" | "bluesky" | "youtube";

export interface FooterSocialLink {
  platform: FooterSocialPlatform;
  url: string;
}

export interface FooterBadge {
  label: string;
  certificate?: string;
}

export interface IFooterProps {
  brand: FooterBrand;
  description?: string;
  linkGroups: FooterLinkGroup[];
  legalLinks: FooterLink[];
  socialLinks: FooterSocialLink[];
  badges: FooterBadge[];
  copywriteText?: string;
}
