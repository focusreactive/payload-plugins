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

export interface PathMap {
  /** locale -> path (leading slash, e.g. "/global-presence/asia/japan") -> page id */
  pathToId: Record<Locale, Record<string, number>>;
  /** page id -> locale -> path */
  idToPath: Record<number, Partial<Record<Locale, string>>>;
}

async function buildPathMap(): Promise<PathMap> {
  const payload = await getPayloadClient();
  const locales = I18N_CONFIG.locales.map((localeConfig) => localeConfig.code as Locale);

  const pathToId = Object.fromEntries(locales.map((locale) => [locale, {}])) as PathMap["pathToId"];
  const idToPath: PathMap["idToPath"] = {};

  // `locale: "all"` returns every localised field as `{ [locale]: value }` in
  // a single request, so the whole route table - every locale, every
  // published page - is built from exactly one query, per the CONTEXT.md
  // spec ("Build one cached path map ... from a single query").
  const { docs } = await payload.find({
    collection: "page",
    depth: 0,
    locale: "all",
    overrideAccess: true,
    pagination: false,
    select: { breadcrumbs: true },
    where: { _status: { equals: "published" } },
  });

  for (const doc of docs as unknown as Array<{
    id: number;
    breadcrumbs?: Partial<Record<Locale, Page["breadcrumbs"]>>;
  }>) {
    const breadcrumbsByLocale = doc.breadcrumbs ?? {};

    for (const locale of locales) {
      const path = breadcrumbsByLocale[locale]?.at(-1)?.url;

      if (!path) {
        // Not every page has been saved under every locale yet (translation
        // in progress, or the locale was added after the page was created).
        // Leaving it out of both directions is correct: there is nothing to
        // route to and nothing to hreflang against.
        continue;
      }

      pathToId[locale][path] = doc.id;
      idToPath[doc.id] = { ...idToPath[doc.id], [locale]: path };
    }
  }

  return { pathToId, idToPath };
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
