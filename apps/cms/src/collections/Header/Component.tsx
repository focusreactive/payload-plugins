import { ButtonVariant } from "@/components/button/types";
import type {
  HeaderAction,
  HeaderFeatured,
  HeaderLink,
  HeaderNavItem,
  IHeaderProps,
} from "./ui/types";
import React from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import { withoutVisualEditing } from "@/lib/utils/withoutVisualEditing";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { Header as HeaderType, Media } from "@/payload-types";

import { HeaderClient } from "./HeaderClient";

interface Props {
  data: HeaderType;
  editable?: boolean;
  disableActive?: boolean;
}

type PayloadNavItem = NonNullable<HeaderType["navItems"]>[number];
type PayloadLink = NonNullable<PayloadNavItem["link"]> & { label?: string | null };
type PayloadAction = NonNullable<HeaderType["actions"]>[number];

const actionAppearanceToVariant: Record<string, ButtonVariant> = {
  accent: ButtonVariant.Accent,
  default: ButtonVariant.Primary,
  ghost: ButtonVariant.Ghost,
  link: ButtonVariant.Default,
  outline: ButtonVariant.Secondary,
};

function resolveHeaderLink(
  link: PayloadLink | null | undefined,
  locale: string,
  fallbackLabel?: string
): HeaderLink | undefined {
  if (!link) {
    return undefined;
  }

  const { href } = prepareLinkProps(link, locale);

  if (!href) {
    return undefined;
  }

  return {
    href,
    label: link.label ?? fallbackLabel ?? "",
    newTab: link.newTab ?? false,
  };
}

function mapFeatured(
  featured: NonNullable<NonNullable<PayloadNavItem["dropdown"]>["featured"]>,
  locale: string
): HeaderFeatured {
  return {
    badge: featured.eyebrow ?? undefined,
    title: featured.title ?? undefined,
    description: featured.description ?? undefined,
    link: resolveHeaderLink(featured.link, locale),
  };
}

function mapNavItem(item: PayloadNavItem, locale: string): HeaderNavItem | null {
  if (item.type === "link") {
    const resolved = resolveHeaderLink(item.link, locale, item.label);
    if (!resolved) {
      return null;
    }
    return { kind: "link", label: item.label, href: resolved.href, newTab: resolved.newTab };
  }

  const dropdown = item.dropdown;
  const featuredEnabled = dropdown?.featured?.enabled === true;

  const links: HeaderLink[] = (dropdown?.links ?? []).flatMap((entry) => {
    const resolved = resolveHeaderLink(entry.link, locale, entry.title);
    if (!resolved) {
      return [];
    }
    return [
      {
        href: resolved.href,
        label: entry.title,
        newTab: resolved.newTab,
        description: entry.description ?? undefined,
      },
    ];
  });

  return {
    kind: "dropdown",
    label: item.label,
    layout: featuredEnabled ? "feature" : "grid",
    featured:
      featuredEnabled && dropdown?.featured ? mapFeatured(dropdown.featured, locale) : undefined,
    links,
  };
}

function mapAction(action: PayloadAction, locale: string): HeaderAction | null {
  const { link } = action;
  const { href } = prepareLinkProps(link, locale);
  if (!href) {
    return null;
  }
  return {
    href,
    label: link.label,
    newTab: link.newTab ?? false,
    variant: actionAppearanceToVariant[link.appearance ?? "default"] ?? ButtonVariant.Primary,
  };
}

export async function Header({ data: rawData, disableActive, editable = false }: Props) {
  if (!rawData) {
    return null;
  }

  const data = editable ? rawData : withoutVisualEditing(rawData);

  const locale = await resolveLocale();

  const logo: Media | null = typeof data.logo === "object" ? data.logo : null;

  const props: IHeaderProps = {
    brand: {
      href: "/",
      label: data.name ?? "",
      logo: logo ? prepareMediaProps({ image: logo }) : null,
    },
    navItems: (data.navItems ?? [])
      .map((item) => mapNavItem(item, locale))
      .filter((item): item is HeaderNavItem => item !== null),
    actions: (data.actions ?? [])
      .map((action) => mapAction(action, locale))
      .filter((action): action is HeaderAction => action !== null),
  };

  return <HeaderClient {...props} disableActive={disableActive} />;
}
