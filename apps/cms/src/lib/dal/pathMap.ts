import { revalidateTag, unstable_cache } from "next/cache";

import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";
import type { Page } from "@/payload-types";

/**
 * The single source of truth for every routable path, in every locale.
 *
 * Why one map instead of a query per path: once the slug is localised
 * (see `slugField.ts`), a document's path is a different string in every
 * locale, and a parent rename changes the path of every descendant in six
 * locales at once. A cache keyed by path (the old `page_<path>_<locale>`
 * tag in `revalidatePageCache.ts`) can never be invalidated correctly,
 * because the write that changes the path is the same write that makes the
 * old tag name unreachable - nothing will ever ask for it again, so it is
 * never revalidated, and it goes on serving stale content forever. Keying
 * by document id instead of path sidesteps that: an id never changes, so
 * one tag can cover the whole map and a full rebuild on every write is
 * cheap and always correct (see the "path map" section of
 * the deal record for this sandbox, outside this repository).
 */
export const PATH_MAP_CACHE_TAG = "path-map";

export interface BreadcrumbEntry {
  label: string;
  url: string;
}

export interface ChildPageEntry {
  id: number;
  title: string;
  description: string | null;
  url: string;
}

export interface PathMap {
  /** locale -> path (leading slash, e.g. "/global-presence/asia/japan") -> page id */
  pathToId: Record<Locale, Record<string, number>>;
  /** page id -> locale -> path */
  idToPath: Record<number, Partial<Record<Locale, string>>>;
  /**
   * page id -> locale -> the full ancestor chain (root first, page itself
   * last), each entry carrying the label Payload's nested-docs plugin
   * captured at that locale. A missing entry for a locale means that page
   * (or an ancestor of it) was never actually translated there - the caller
   * must render nothing rather than fall back to another locale's chain,
   * because the breadcrumb's whole point is that the chain differs per
   * language.
   */
  idToBreadcrumbs: Record<number, Partial<Record<Locale, BreadcrumbEntry[]>>>;
  /**
   * page id -> locale -> its direct published children, in that locale.
   * Built from each doc's own `parent` id rather than a per-page query, so
   * the child list costs nothing beyond the one query the whole map already
   * makes. A child absent from a locale's array was not translated there
   * and must not be listed, for the same reason as idToBreadcrumbs.
   */
  childrenByParentId: Record<number, Partial<Record<Locale, ChildPageEntry[]>>>;
}

async function buildPathMap(): Promise<PathMap> {
  const payload = await getPayloadClient();
  const locales = I18N_CONFIG.locales.map((localeConfig) => localeConfig.code as Locale);

  const pathToId = Object.fromEntries(locales.map((locale) => [locale, {}])) as PathMap["pathToId"];
  const idToPath: PathMap["idToPath"] = {};
  const idToBreadcrumbs: PathMap["idToBreadcrumbs"] = {};
  const childrenByParentId: PathMap["childrenByParentId"] = {};

  // `locale: "all"` returns every localised field as `{ [locale]: value }` in
  // a single request, so the whole route table - every locale, every
  // published page - is built from exactly one query, per the CONTEXT.md
  // spec ("Build one cached path map ... from a single query"). `title`,
  // `parent` and `meta.description` ride along on that same query so the
  // breadcrumb and child-list components below cost no extra reads.
  const { docs } = await payload.find({
    collection: "page",
    depth: 0,
    locale: "all",
    overrideAccess: true,
    pagination: false,
    select: { breadcrumbs: true, title: true, parent: true, meta: true },
    where: { _status: { equals: "published" } },
  });

  for (const doc of docs as unknown as Array<{
    id: number;
    parent?: number | null;
    breadcrumbs?: Partial<Record<Locale, Page["breadcrumbs"]>>;
    title?: Partial<Record<Locale, string>>;
    meta?: Partial<Record<Locale, { description?: string | null }>>;
  }>) {
    const breadcrumbsByLocale = doc.breadcrumbs ?? {};

    for (const locale of locales) {
      const crumbs = breadcrumbsByLocale[locale];
      const path = crumbs?.at(-1)?.url;

      if (!path) {
        // Not every page has been saved under every locale yet (translation
        // in progress, or the locale was added after the page was created).
        // Leaving it out of every map is correct: there is nothing to route
        // to, nothing to hreflang against, and nothing genuine to show as a
        // breadcrumb or a child link.
        continue;
      }

      pathToId[locale][path] = doc.id;
      idToPath[doc.id] = { ...idToPath[doc.id], [locale]: path };

      const chain = (crumbs ?? [])
        .filter((crumb): crumb is { label: string; url: string } =>
          Boolean(crumb.label && crumb.url)
        )
        .map((crumb) => ({ label: crumb.label, url: crumb.url }));

      idToBreadcrumbs[doc.id] = { ...idToBreadcrumbs[doc.id], [locale]: chain };

      if (doc.parent) {
        const entry: ChildPageEntry = {
          id: doc.id,
          title: doc.title?.[locale] ?? "",
          description: doc.meta?.[locale]?.description ?? null,
          url: path,
        };

        childrenByParentId[doc.parent] = {
          ...childrenByParentId[doc.parent],
          [locale]: [...(childrenByParentId[doc.parent]?.[locale] ?? []), entry],
        };
      }
    }
  }

  return { pathToId, idToPath, idToBreadcrumbs, childrenByParentId };
}

export async function getPathMap(): Promise<PathMap> {
  return unstable_cache(buildPathMap, ["path-map"], {
    revalidate: false,
    tags: [PATH_MAP_CACHE_TAG],
  })();
}

/**
 * Called from `afterChange`/`afterDelete` on every routable collection.
 * Rebuilds the whole map on the next read rather than patching one entry,
 * because a single write (a parent rename) can move every descendant's path
 * in one locale, and there is no cheap way to know which entries that
 * touched without doing the rebuild anyway.
 */
export function revalidatePathMap(): void {
  revalidateTag(PATH_MAP_CACHE_TAG, "max");
}
