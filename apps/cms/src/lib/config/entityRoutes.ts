import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

/**
 * URL prefixes of the record-driven page types. The collection slugs stay neutral; the public URL
 * of each type is set here only, so a prefix changes without renaming a collection or a table.
 * Clinics nest under their state: `${locations}/{state}/{clinic}`.
 */
export const ENTITY_ROUTE_PREFIXES = {
  conditions: "vein-diseases",
  doctors: "vein-doctors",
  locations: "locations",
  treatments: "vein-treatments",
} as const;

export const ENTITY_COLLECTIONS = [
  "states",
  "clinics",
  "doctors",
  "treatments",
  "conditions",
] as const;

export type EntityCollection = (typeof ENTITY_COLLECTIONS)[number];

export type EntityRouteMatch =
  | { collection: "states"; slug: string }
  | { collection: "clinics"; slug: string; stateSlug: string }
  | { collection: "doctors" | "treatments" | "conditions"; slug: string };

/** Maps URL segments (locale already removed) to a record, or null when a Page should answer. */
export function matchEntityRoute(segments: string[]): EntityRouteMatch | null {
  const [prefix, first, second, ...rest] = segments;

  if (!prefix || !first || rest.length > 0) {
    return null;
  }

  if (prefix === ENTITY_ROUTE_PREFIXES.locations) {
    return second
      ? { collection: "clinics", slug: second, stateSlug: first }
      : { collection: "states", slug: first };
  }

  if (second) {
    return null;
  }

  if (prefix === ENTITY_ROUTE_PREFIXES.treatments) {
    return { collection: "treatments", slug: first };
  }

  if (prefix === ENTITY_ROUTE_PREFIXES.conditions) {
    return { collection: "conditions", slug: first };
  }

  if (prefix === ENTITY_ROUTE_PREFIXES.doctors) {
    return { collection: "doctors", slug: first };
  }

  return null;
}

interface EntityPathInput {
  collection: EntityCollection;
  slug?: string | null;
  /** Clinics only: the slug of the state the clinic belongs to. */
  stateSlug?: string | null;
}

/** Path of a record without the locale prefix, or null while a slug it needs is missing. */
export function entityPath({ collection, slug, stateSlug }: EntityPathInput): string | null {
  if (!slug) {
    return null;
  }

  switch (collection) {
    case "states": {
      return `/${ENTITY_ROUTE_PREFIXES.locations}/${slug}`;
    }
    case "clinics": {
      return stateSlug ? `/${ENTITY_ROUTE_PREFIXES.locations}/${stateSlug}/${slug}` : null;
    }
    case "doctors": {
      return `/${ENTITY_ROUTE_PREFIXES.doctors}/${slug}`;
    }
    case "treatments": {
      return `/${ENTITY_ROUTE_PREFIXES.treatments}/${slug}`;
    }
    case "conditions": {
      return `/${ENTITY_ROUTE_PREFIXES.conditions}/${slug}`;
    }
  }
}

export function withLocalePrefix(path: string, locale: string): string {
  if (!shouldIncludeLocalePrefix(locale)) {
    return path || "/";
  }

  return `/${locale}${path === "/" ? "" : path}`;
}
