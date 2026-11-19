import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import { findEntities } from "@/dal/entities";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { entityDocPath, localizeHref, siteLinkHref } from "@/lib/site/links";
import type { SiteLinkValue } from "@/lib/site/links";
import type { Locale } from "@/lib/types";
import type { Footer, Header } from "@/payload-types";

export interface ChromeLink {
  href: string;
  label: string;
  newTab: boolean;
}

type StockLink = Parameters<typeof prepareLinkProps>[0];

/** A link stored with the standard link field, as a locale-aware href. */
export function stockLinkHref(link: StockLink, locale: string): string {
  if (!link) {
    return "";
  }

  if (link.type === "custom") {
    return localizeHref(stripMarkers(link.url) ?? "", locale);
  }

  return prepareLinkProps(link, locale).href;
}

export function headerMenuLinks(header: Header | null, locale: string): ChromeLink[] {
  return (header?.navItems ?? []).flatMap((item) => {
    const href = stockLinkHref(item.link as StockLink, locale);

    return href ? [{ href, label: item.label, newTab: item.link?.newTab ?? false }] : [];
  });
}

export function headerActions(header: Header | null, locale: string): ChromeLink[] {
  return (header?.actions ?? []).flatMap((action) => {
    const href = stockLinkHref(action as StockLink, locale);

    return href ? [{ href, label: action.label ?? "", newTab: action.newTab ?? false }] : [];
  });
}

export function siteLinks(
  rows: { label: string; link?: SiteLinkValue | null }[] | null | undefined,
  locale: string
): ChromeLink[] {
  return (rows ?? []).flatMap((row) => {
    const href = siteLinkHref(row.link, locale);

    return href ? [{ href, label: row.label, newTab: row.link?.newTab ?? false }] : [];
  });
}

export function footerLinks(
  links: NonNullable<Footer["legalLinks"]> | null | undefined,
  locale: string
): ChromeLink[] {
  return (links ?? []).flatMap(({ link }) => {
    const href = stockLinkHref(link as StockLink, locale);

    return href ? [{ href, label: link?.label ?? "", newTab: link?.newTab ?? false }] : [];
  });
}

export interface StateLocations {
  id: number | string;
  name: string;
  href: string;
  clinics: { id: number | string; name: string; href: string }[];
}

/** Every published state with its published clinics, for the footer and the clinics count. */
export async function getLocationsByState(locale: Locale): Promise<StateLocations[]> {
  const [states, clinics] = await Promise.all([
    findEntities("states", { depth: 0, locale, sort: "name" }),
    findEntities("clinics", { depth: 0, locale, sort: "name" }),
  ]);

  return states.map((state) => {
    const statePath = entityDocPath("states", state) ?? "/";

    return {
      clinics: clinics
        .filter(
          (clinic) =>
            (typeof clinic.state === "object" ? clinic.state?.id : clinic.state) === state.id
        )
        .map((clinic) => ({
          href: withLocalePrefix(`${statePath}/${stripMarkers(clinic.slug)}`, locale),
          id: clinic.id,
          name: clinic.name,
        })),
      href: withLocalePrefix(statePath, locale),
      id: state.id,
      name: state.name,
    };
  });
}
