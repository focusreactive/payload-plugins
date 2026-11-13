import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { entityPath, withLocalePrefix } from "@/lib/config/entityRoutes";
import type { EntityCollection } from "@/lib/config/entityRoutes";
import { getPathFromBreadcrumbs } from "@/lib/utils/path/getPathFromBreadcrumbs";
import type { Clinic, Condition, Doctor, Page, Post, State, Treatment } from "@/payload-types";

export type RoutedDocRef =
  | { relationTo: "page"; value: number | Page }
  | { relationTo: "posts"; value: number | Post }
  | { relationTo: "states"; value: number | State }
  | { relationTo: "clinics"; value: number | Clinic }
  | { relationTo: "doctors"; value: number | Doctor }
  | { relationTo: "treatments"; value: number | Treatment }
  | { relationTo: "conditions"; value: number | Condition };

export interface SiteLinkValue {
  kind?: "internal" | "relative" | "external" | null;
  newTab?: boolean | null;
  page?: RoutedDocRef | null;
  path?: string | null;
  url?: string | null;
}

const isAbsoluteUrl = (value: string): boolean => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(value);

/** Adds the locale prefix to a path on this site and leaves full URLs, mailto: and tel: alone. */
export function localizeHref(href: string, locale: string): string {
  if (!href || href.startsWith("#") || isAbsoluteUrl(href)) {
    return href;
  }

  return withLocalePrefix(href.startsWith("/") ? href : `/${href}`, locale);
}

export function clinicPath(clinic: Pick<Clinic, "slug" | "state">): string | null {
  const stateSlug = typeof clinic.state === "object" ? clinic.state?.slug : null;

  return entityPath({ collection: "clinics", slug: stripMarkers(clinic.slug), stateSlug });
}

export function entityDocPath(
  collection: EntityCollection,
  doc: { slug?: string | null; state?: number | State | null }
): string | null {
  if (collection === "clinics") {
    return clinicPath(doc as Clinic);
  }

  return entityPath({ collection, slug: stripMarkers(doc.slug) });
}

/** Path of any routed record without the locale prefix. Needs the record populated (depth 1+). */
export function routedDocPath(ref: RoutedDocRef | null | undefined): string | null {
  if (!ref || typeof ref.value !== "object" || ref.value === null) {
    return null;
  }

  if (ref.relationTo === "page") {
    const path = getPathFromBreadcrumbs(ref.value.breadcrumbs) ?? ref.value.slug;
    const cleanPath = stripMarkers(path);

    return !cleanPath || cleanPath === "home" ? "/" : `/${cleanPath}`;
  }

  if (ref.relationTo === "posts") {
    return ref.value.slug ? `${BLOG_CONFIG.basePath}/${stripMarkers(ref.value.slug)}` : null;
  }

  return entityDocPath(ref.relationTo, ref.value);
}

/** The href a link field points at, or undefined when it is not set. */
export function siteLinkHref(
  link: SiteLinkValue | null | undefined,
  locale: string
): string | undefined {
  if (!link) {
    return undefined;
  }

  if (link.kind === "external") {
    return stripMarkers(link.url)?.trim() || undefined;
  }

  if (link.kind === "relative") {
    const path = stripMarkers(link.path)?.trim();

    return path ? localizeHref(path, locale) : undefined;
  }

  const path = routedDocPath(link.page);

  return path ? withLocalePrefix(path, locale) : undefined;
}

export const siteLinkTarget = (
  link: SiteLinkValue | null | undefined
): { target?: "_blank"; rel?: string } =>
  link?.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

export const telHref = (phone: string | null | undefined): string | undefined => {
  const digits = stripMarkers(phone)?.replaceAll(/\D/gu, "");

  return digits ? `tel:${digits}` : undefined;
};
