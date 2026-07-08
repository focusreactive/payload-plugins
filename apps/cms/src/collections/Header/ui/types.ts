import type { ButtonVariant } from "@/components/button/types";
import type { PreparedMedia } from "@/components/media";

export interface HeaderLink {
  label: string;
  href: string;
  newTab?: boolean;
  description?: string;
  active?: boolean;
}

export interface HeaderFeatured {
  badge?: string;
  title?: string;
  description?: string;
  link?: HeaderLink;
}

export type HeaderDropdownLayout = "feature" | "grid";

export interface HeaderNavLinkItem {
  kind: "link";
  label: string;
  href: string;
  newTab?: boolean;
  active?: boolean;
}

export interface HeaderNavDropdownItem {
  kind: "dropdown";
  label: string;
  layout: HeaderDropdownLayout;
  featured?: HeaderFeatured;
  links: HeaderLink[];
  active?: boolean;
}

export type HeaderNavItem = HeaderNavLinkItem | HeaderNavDropdownItem;

export interface HeaderAction {
  label: string;
  href: string;
  newTab?: boolean;
  variant: ButtonVariant;
}

export interface HeaderBrand {
  label: string;
  href: string;
  logo?: PreparedMedia | null;
}

export interface IHeaderProps {
  brand: HeaderBrand;
  navItems: HeaderNavItem[];
  actions: HeaderAction[];
  className?: string;
}
