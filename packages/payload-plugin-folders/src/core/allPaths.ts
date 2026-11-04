import type { Payload, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId } from "../types.js";
import { livePathsByLocale } from "./alternates.js";
import { getLocaleCodes } from "./locales.js";
import { normalizePath } from "./paths.js";
import {
  buildLiveAnywhereWhere,
  buildLiveInLocaleWhere,
  collectionHasDrafts,
} from "./publishedWhere.js";
import { isForbidden, resolveReadMode } from "./readMode.js";
import type { ReadModeArgs } from "./readMode.js";
import { relationIdOf } from "./relationId.js";
import { resolveRequestLocale } from "./resolve.js";
import { getResolvedOptions } from "./runtime.js";

export type PathRow = {
  collection: string;
  fullPath: string;
  id: FolderId;
  /** `null` when nothing is localized. */
  locale: string | null;
  updatedAt: string;
};

export type PathsArgs = ReadModeArgs & {
  /** One locale, or `all` for a row per page and locale. Default: the default locale. */
  locale?: string | "all" | null;
  /** `/blog`: that folder's root page and every page beneath it. With `all`, the folder is looked up in each locale in turn, the default locale first. */
  rootPages?: "exclude" | "include" | "only";
  under?: string;
};

/** The most pages one endpoint request returns; a request may ask for fewer. */
export const maxPathsPerRequest = 10_000;

export type PathsPageArgs = PathsArgs & {
  /** Pages per request, at most `maxPathsPerRequest`. With `locale: "all"` a page gives a row per live locale. */
  limit: number;
  /** From 1. */
  page: number;
};

export type PathsPage = {
  docs: PathRow[];
  /** Whether more pages exist past this one. */
  hasNextPage: boolean;
};

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

/** The folder at `path` in `locale`, the reader permitting; `null` when there is none. */
const findFolderAt = async ({
  locale,
  mode,
  path,
  payload,
}: {
  locale: string | null;
  mode: ReturnType<typeof resolveReadMode>;
  path: string;
  payload: Payload;
}): Promise<FolderId | null> => {
  const options = getResolvedOptions(payload);
  try {
    const { docs } = await payload.find({
      collection: toCollectionSlug(options.folders.slug),
      depth: 0,
      limit: 1,
      ...(locale === null || !options.localizeSegments ? {} : { locale: locale as never }),
      overrideAccess: mode.overrideAccess,
      pagination: false,
      select: { id: true } as SelectType,
      sort: "id",
      user: mode.user,
      where: { fullPath: { equals: path } },
    });

    return relationIdOf((docs[0] as { id?: unknown } | undefined)?.id);
  } catch (error) {
    if (isForbidden(error)) {
      return null;
    }
    throw error;
  }
};

type PathsScope = {
  codes: string[];
  isAllLocales: boolean;
  mode: ReturnType<typeof resolveReadMode>;
  /** `none` when the `under` folder does not exist, so nothing is listed. */
  inside: Where | null | "none";
  options: ReturnType<typeof getResolvedOptions>;
  payload: Payload;
  rootPages: "exclude" | "include" | "only";
  rowLocales: Array<string | null>;
  singleLocale: string | null;
};

const buildScope = async (payload: Payload, args: PathsArgs): Promise<PathsScope> => {
  const options = getResolvedOptions(payload);
  const mode = resolveReadMode(args);
  const codes = getLocaleCodes(payload.config);
  const isAllLocales = args.locale === "all" && codes.length > 0;
  const singleLocale = isAllLocales ? null : resolveRequestLocale(payload, args.locale);
  const scope: PathsScope = {
    codes,
    inside: null,
    isAllLocales,
    mode,
    options,
    payload,
    rootPages: args.rootPages ?? "include",
    rowLocales: isAllLocales ? codes : [singleLocale],
    singleLocale,
  };

  const under = args.under === undefined ? "/" : normalizePath(args.under);
  if (under === "/") {
    return scope;
  }
  // A folder's path differs by locale, so `all` tries each locale's path, the default locale first.
  const lookupLocales = isAllLocales
    ? [resolveRequestLocale(payload, null), ...codes].filter(
        (code, index, list) => list.indexOf(code) === index
      )
    : [singleLocale];
  let folderId: FolderId | null = null;
  for (const locale of lookupLocales) {
    folderId = await findFolderAt({ locale, mode, path: under, payload });
    if (folderId !== null) {
      break;
    }
  }
  if (folderId === null) {
    return { ...scope, inside: "none" };
  }

  return {
    ...scope,
    inside: {
      or: [
        { folder: { equals: folderId } },
        { "folder.ancestorIds": { contains: `/${String(folderId)}/` } },
      ],
    },
  };
};

const buildCollectionWhere = (scope: PathsScope, slug: string): Where | null => {
  const { inside, isAllLocales, mode, payload, rootPages, singleLocale } = scope;
  let live: Where | null = null;
  if (!mode.draft) {
    live = isAllLocales
      ? buildLiveAnywhereWhere(payload, slug)
      : buildLiveInLocaleWhere(payload, slug, singleLocale);
  }
  const rootClause: Where | null =
    rootPages === "only"
      ? { isFolderRoot: { equals: true } }
      : rootPages === "exclude"
        ? { isFolderRoot: { not_equals: true } }
        : null;
  const clauses = [inside === "none" ? null : inside, live, rootClause].filter(
    (clause): clause is Where => clause !== null
  );

  return clauses.length > 0 ? { and: clauses } : null;
};

const readPathDocs = async (
  scope: PathsScope,
  slug: string,
  window: { limit: number; page: number } | null
): Promise<{ docs: Array<Record<string, unknown>>; totalDocs: number }> => {
  const { codes, mode, payload } = scope;
  const hasDrafts = collectionHasDrafts(payload, slug);
  const where = buildCollectionWhere(scope, slug);
  const result = await payload.find({
    collection: toCollectionSlug(slug),
    depth: 0,
    draft: mode.draft,
    locale: codes.length > 0 ? ("all" as never) : undefined,
    overrideAccess: mode.overrideAccess,
    select: {
      ...(hasDrafts ? { _status: true } : {}),
      fullPath: true,
      updatedAt: true,
    } as SelectType,
    user: mode.user,
    ...(where ? { where } : {}),
    ...(window
      ? { limit: window.limit, page: window.page, pagination: true, sort: "id" }
      : { pagination: false }),
  });

  return {
    docs: result.docs as unknown as Array<Record<string, unknown>>,
    totalDocs: result.totalDocs ?? result.docs.length,
  };
};

const toPathRows = (
  scope: PathsScope,
  slug: string,
  docs: Array<Record<string, unknown>>
): PathRow[] => {
  const { codes, mode, payload, rowLocales } = scope;
  const hasDrafts = collectionHasDrafts(payload, slug);
  const rows: PathRow[] = [];
  for (const doc of docs) {
    const livePaths =
      codes.length > 0
        ? livePathsByLocale({
            draft: mode.draft,
            fullPath: doc.fullPath,
            hasDrafts,
            payload,
            status: doc._status,
          })
        : {};
    for (const locale of rowLocales) {
      const fullPath = locale === null ? toText(doc.fullPath) : (livePaths[locale] ?? "");
      if (fullPath !== "") {
        rows.push({
          collection: slug,
          fullPath,
          id: doc.id as FolderId,
          locale,
          updatedAt: toText(doc.updatedAt),
        });
      }
    }
  }

  return rows;
};

/**
 * Spec section 10.1 `getAllPaths`: one row for each page the reader can see, in each locale it is
 * live in (published only unless a signed-in reader asks for `draft`), for sitemaps and static
 * generation. Rows are ordered by path, then locale, collection and id, so the list is stable from
 * one call to the next.
 *
 * This reads every matching page into memory to sort it, which a Local API caller in its own
 * process may do. A request-sized answer for a large site goes through `getPathsPage` (and the
 * `paths` endpoint), which reads one page of rows from the database.
 */
export const getAllPaths = async (payload: Payload, args: PathsArgs = {}): Promise<PathRow[]> => {
  const scope = await buildScope(payload, args);
  if (scope.inside === "none") {
    return [];
  }

  const rows: PathRow[] = [];
  for (const page of Object.values(scope.options.collections)) {
    try {
      const { docs } = await readPathDocs(scope, page.slug, null);
      rows.push(...toPathRows(scope, page.slug, docs));
    } catch (error) {
      if (!isForbidden(error)) {
        throw error;
      }
    }
  }

  return rows.toSorted(
    (left, right) =>
      left.fullPath.localeCompare(right.fullPath, "en") ||
      (left.locale ?? "").localeCompare(right.locale ?? "", "en") ||
      left.collection.localeCompare(right.collection, "en") ||
      String(left.id).localeCompare(String(right.id), "en", { numeric: true })
  );
};

/**
 * One page of `getAllPaths`, read from the database: the pages of each collection in the order the
 * options list them, by id inside a collection (the path of a page is composed after the read, so
 * the database cannot sort by it), `limit` pages from page `page`. A collection the window falls
 * in costs one query for the window, plus a second when the window crosses a database page, and a
 * collection the window starts past costs one query that reads a single row. A request therefore
 * reads about `limit` pages however deep it is, and walking a whole site reads each page about
 * twice.
 *
 * `limit` counts pages of the collections: with `locale: "all"` a page gives a row for each locale
 * it is live in, and a page live in no locale of the request gives none, so `docs` can hold more
 * or fewer rows than `limit`. `hasNextPage` is true when a further page exists.
 */
export const getPathsPage = async (payload: Payload, args: PathsPageArgs): Promise<PathsPage> => {
  const scope = await buildScope(payload, args);
  if (scope.inside === "none") {
    return { docs: [], hasNextPage: false };
  }
  const { limit } = args;

  let skip = (args.page - 1) * limit;
  // One more than the page holds, so its presence says whether a next page exists.
  let need = limit + 1;
  const rows: PathRow[] = [];
  let pagesCollected = 0;
  for (const page of Object.values(scope.options.collections)) {
    if (need === 0) {
      break;
    }
    try {
      if (skip > 0) {
        // The size of the collection tells whether the window starts past it, for one row read.
        const { totalDocs } = await readPathDocs(scope, page.slug, { limit: 1, page: 1 });
        if (totalDocs <= skip) {
          skip -= totalDocs;
          continue;
        }
      }
      // Pages of `need` rows: a window of `need` rows from any offset touches at most two of them.
      const firstDatabasePage = Math.floor(skip / need) + 1;
      const first = await readPathDocs(scope, page.slug, { limit: need, page: firstDatabasePage });
      let docs = first.docs.slice(skip % need);
      if (docs.length < need && first.docs.length === need) {
        const second = await readPathDocs(scope, page.slug, {
          limit: need,
          page: firstDatabasePage + 1,
        });
        docs = [...docs, ...second.docs];
      }
      docs = docs.slice(0, need);
      skip = 0;
      need -= docs.length;
      // The extra page is only counted, never listed.
      const listed = docs.slice(0, Math.max(0, limit - pagesCollected));
      pagesCollected += docs.length;
      rows.push(...toPathRows(scope, page.slug, listed));
    } catch (error) {
      if (!isForbidden(error)) {
        throw error;
      }
    }
  }

  return { docs: rows, hasNextPage: pagesCollected > limit };
};
