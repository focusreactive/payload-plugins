import type { ButtonVariant } from "../../ui/button/types";
import type { IImageProps } from "../../ui/image/types";

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
  logo?: IImageProps | null;
}

export interface IHeaderProps {
  brand: HeaderBrand;
  navItems: HeaderNavItem[];
  actions: HeaderAction[];
  className?: string;
}
